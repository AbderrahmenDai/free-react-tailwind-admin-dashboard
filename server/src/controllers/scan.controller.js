const { OrdreFabrication, HandlingUnit, HistoriqueScan, ReferenceProduit } = require("../models");
const sequelize = require("../config/db");

exports.processScan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ordreFabricationId, galiaData, forceValidation, justification } = req.body;
    const operator = req.user;

    // 1. Fetch OF Details
    const of = await OrdreFabrication.findByPk(ordreFabricationId, {
      include: [{ model: ReferenceProduit, as: "reference" }],
      transaction: t,
    });

    if (!of) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "OF non trouvé" });
    }

    if (of.statut !== "EN_COURS") {
      await t.rollback();
      return res.status(400).json({ success: false, message: "OF non actif" });
    }

    const { reference, numeroHU, quantite, qualite, indice } = galiaData;
    const errors = [];
    let typeErreur = "AUCUNE";

    // 2. Validate Reference
    if (reference !== of.reference.codeReference) {
      errors.push(`Référence incorrecte. Attendu: ${of.reference.codeReference}, Reçu: ${reference}`);
      typeErreur = "REFERENCE_INCORRECTE";
    }

    // 3. Validate Indice
    if (indice && indice !== of.reference.indice) {
      errors.push(`Indice incorrect. Attendu: ${of.reference.indice}, Reçu: ${indice}`);
      if (typeErreur === "AUCUNE") typeErreur = "INDICE_INCORRECT";
    }

    // 4. Find HU
    let hu = await HandlingUnit.findOne({
      where: { numeroHU, ordreFabricationId: of.id },
      transaction: t,
    });

    if (!hu) {
      // Logic: Create HU on the fly? Doc implies HU might exist or be created by bulk.
      // But usually "Find HU" implies it should exist.
      // Error type HU_NON_TROUVE exists.
      // However, if we accept "new" HUs, we might create them.
      // Assuming strict mode: HU must be pre-declared in OF structure or allowed to be added?
      // Doc says: "Find HU... if not found throw Error or return HU_NON_TROUVE"
      // Let's assume strict validation first.
      errors.push("HU non trouvé dans l'OF");
      if (typeErreur === "AUCUNE") typeErreur = "HU_NON_TROUVE";
    } else {
        // 5. Check if already scanned
        if (hu.statut === "VALIDE" && !forceValidation) {
            errors.push("HU déjà scanné et validé");
            if (typeErreur === "AUCUNE") typeErreur = "HU_DEJA_SCANNE";
        }

        // 6. Verify Quantity
        const tolerance = parseFloat(process.env.QUANTITY_TOLERANCE || 5.0);
        const quantityDiff = Math.abs(quantite - hu.quantitePrevue);
        const percentDiff = (quantityDiff / hu.quantitePrevue) * 100;

        if (percentDiff > tolerance) {
            errors.push(`Quantité hors tolérance (${percentDiff.toFixed(2)}%). Attendu: ${hu.quantitePrevue}, Scanné: ${quantite}`);
            if (typeErreur === "AUCUNE") typeErreur = "QUANTITE_INCORRECTE";
        }

        // 7. Verify Quality
        if (qualite !== "CONFORME") {
            errors.push("Qualité non conforme");
            if (typeErreur === "AUCUNE") typeErreur = "QUALITE_NON_CONFORME";
        }
    }

    const isSuccess = errors.length === 0;
    
    // Create History
    const history = await HistoriqueScan.create({
      ordreFabricationId: of.id,
      handlingUnitId: hu ? hu.id : null,
      dateHeureScan: new Date(),
      referenceScannee: reference,
      quantiteScannee: quantite,
      qualiteScannee: qualite,
      resultatVerification: isSuccess ? "SUCCES" : "ECHEC",
      typeErreur: isSuccess ? "AUCUNE" : typeErreur,
      operateur: operator.id,
      validationForcee: forceValidation || false,
      commentaire: justification || (isSuccess ? "Scan valide" : errors.join(", ")),
      donneesGALIA: galiaData,
    }, { transaction: t });

    if (!isSuccess && !forceValidation) {
      await t.commit(); // Save the failed attempt log
      return res.status(400).json({
        success: false,
        message: "Échec de la vérification",
        errors,
        typeErreur,
        data: {
            expected: {
                reference: of.reference.codeReference,
                indice: of.reference.indice,
                quantite: hu ? hu.quantitePrevue : "N/A"
            },
            scanned: galiaData,
            historyId: history.id
        }
      });
    }

    // Success or Forced Validation
    if (hu) {
        await hu.update({
            statut: "VALIDE",
            quantiteReelle: quantite,
            dateScan: new Date(),
            scannePar: operator.id,
            valdiationForcee: forceValidation || false,
            justificationForcage: justification,
            qualite: qualite
        }, { transaction: t });
    }

    // Check OF Completion
    // Check if all HUs in this OF are VALIDE
    const pendingHUs = await HandlingUnit.count({
        where: {
            ordreFabricationId: of.id,
            statut: ["A_SCANNER", "SCANNE", "REJETE"] // Any status not VALIDE
        },
        transaction: t
    });

    let allOFCompleted = false;
    if (pendingHUs === 0) {
        await of.update({ statut: "TERMINE", dateCloture: new Date() }, { transaction: t });
        allOFCompleted = true;
    }

    await t.commit();

    res.json({
        success: true,
        message: "HU validé avec succès",
        data: {
            hu: hu,
            of: of,
            warnings: forceValidation ? errors : [],
            allOFCompleted,
            historyId: history.id
        }
    });

  } catch (error) {
    await t.rollback();
    console.error("Scan error:", error);
    res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

exports.getScanStatus = async (req, res) => {
    try {
        const { ofId } = req.params;
        const of = await OrdreFabrication.findByPk(ofId, {
            include: [{ model: ReferenceProduit, as: "reference" }]
        });
        
        if (!of) return res.status(404).json({ message: "OF non trouvé" });

        const total = await HandlingUnit.count({ where: { ordreFabricationId: ofId } });
        const validated = await HandlingUnit.count({ where: { ordreFabricationId: ofId, statut: "VALIDE" } });
        const rejected = await HandlingUnit.count({ where: { ordreFabricationId: ofId, statut: "REJETE" } });
        const pending = total - validated - rejected;
        const percentage = total > 0 ? ((validated / total) * 100).toFixed(2) : 0;

        const handlingUnits = await HandlingUnit.findAll({ 
            where: { ordreFabricationId: ofId },
            order: [["numeroHU", "ASC"]]
        });

        res.json({
            of,
            progress: {
                total,
                validated,
                rejected,
                pending,
                percentage
            },
            handlingUnits
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const history = await HistoriqueScan.findAndCountAll({
            include: [
                { model: OrdreFabrication, as: "ordreFabrication", attributes: ["numeroOF"] },
                { model: HandlingUnit, as: "handlingUnit", attributes: ["numeroHU"] },
                { model: User, as: "createur", attributes: ["username"] } // HistoriqueScan usually links operator via operateur
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [["dateHeureScan", "DESC"]]
        });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
