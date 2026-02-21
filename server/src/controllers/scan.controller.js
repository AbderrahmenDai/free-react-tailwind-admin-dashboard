const { OrdreFabrication, HandlingUnit, HistoriqueScan, ReferenceProduit, User } = require("../models");
const sequelize = require("../config/db");

exports.processScan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ordreFabricationId, galiaData, forceValidation, justification } = req.body;
    // user is usually attached by auth middleware
    const operator = req.user || { id: 1 }; // Fallback if no auth

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
      return res.status(400).json({ success: false, message: "OF non actif (Statut: " + of.statut + ")" });
    }

    const { reference, numeroHU, quantite, qualite, indice } = galiaData;
    const errors = [];
    let typeErreur = "AUCUNE";

    // 2. Validate Reference (Client or Internal)
    const normalizedRef = reference ? reference.trim() : "";
    const isClientRef = normalizedRef === of.reference.referenceClient;
    const isInternalRef = normalizedRef === of.reference.codeReference;

    if (!isClientRef && !isInternalRef) {
      // Check if this reference exists elsewhere in the DB for better feedback
      const existingRef = await ReferenceProduit.findOne({ 
        where: sequelize.or(
            { referenceClient: normalizedRef },
            { codeReference: normalizedRef }
        ),
        transaction: t
      });

      if (existingRef) {
          errors.push(`Référence incohérente avec l'OF. Scanné: ${normalizedRef} (Appartient à ${existingRef.codeReference}), Attendu: ${of.reference.referenceClient} ou ${of.reference.codeReference}`);
          typeErreur = "REFERENCE_MISMATCH";
      } else {
          errors.push(`Référence client inconnue dans la base: ${normalizedRef}`);
          typeErreur = "REFERENCE_INCONNUE";
      }
    }

    // 3. Validate Indice (if provided)
    if (indice && indice !== of.reference.indice) {
      errors.push(`Indice incorrect. Attendu: ${of.reference.indice}, Reçu: ${indice}`);
      if (typeErreur === "AUCUNE") typeErreur = "INDICE_INCORRECT";
    }

    // 4. Find HU
    // We check if this HU exists within THIS OF.
    let hu = await HandlingUnit.findOne({
      where: { numeroHU, ordreFabricationId: of.id },
      transaction: t,
    });

    if (!hu) {
      // Check if it belongs to another OF
      const huElsewhere = await HandlingUnit.findOne({
          where: { numeroHU },
          include: [{ model: OrdreFabrication, as: "ordreFabrication" }],
          transaction: t
      });

      if (huElsewhere) {
          errors.push(`Ce HU (${numeroHU}) appartient à un autre OF (${huElsewhere.ordreFabrication?.numeroOF || 'Inconnu'}).`);
          if (typeErreur === "AUCUNE") typeErreur = "HU_DANS_AUTRE_OF";
      } else {
          errors.push(`HU ${numeroHU} non trouvé dans cet OF.`);
          if (typeErreur === "AUCUNE") typeErreur = "HU_NON_TROUVE";
      }
    } else {
        // 5. Check if already scanned
        if (hu.statut === "VALIDE" && !forceValidation) {
            errors.push("HU déjà scanné et validé");
            if (typeErreur === "AUCUNE") typeErreur = "HU_DEJA_SCANNE";
        }

        // 6. Verify Quantity
        const tolerance = parseFloat(process.env.QUANTITY_TOLERANCE || 5.0);
        const quantitePrevue = parseFloat(hu.quantitePrevue);
        const quantiteScan = parseFloat(quantite);
        
        const quantityDiff = Math.abs(quantiteScan - quantitePrevue);
        const percentDiff = quantitePrevue > 0 ? (quantityDiff / quantitePrevue) * 100 : (quantityDiff > 0 ? 100 : 0);

        if (percentDiff > tolerance) {
            errors.push(`Quantité hors tolérance (${percentDiff.toFixed(2)}%). Attendu: ${quantitePrevue}, Scanné: ${quantiteScan}`);
            if (typeErreur === "AUCUNE") typeErreur = "QUANTITE_INCORRECTE";
        }
    }

    const isSuccess = errors.length === 0;
    
    // Create History
    const history = await HistoriqueScan.create({
      ordreFabricationId: of.id,
      handlingUnitId: hu ? hu.id : null,
      dateHeureScan: new Date(),
      referenceScannee: normalizedRef,
      quantiteScannee: quantite,
      qualiteScannee: qualite || "CONFORME",
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
                clientRef: of.reference.referenceClient,
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
            validationForcee: forceValidation || false,
            justificationForcage: justification,
            qualite: qualite || "CONFORME"
        }, { transaction: t });
    }

    // Check OF Completion
    const pendingHUs = await HandlingUnit.count({
        where: {
            ordreFabricationId: of.id,
            statut: ["A_SCANNER", "SCANNE", "REJETE"]
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
    if (t) await t.rollback();
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
        console.error(error);
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
                { model: User, as: "operator", attributes: ["username", "email"] } 
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

/**
 * POST /scan/verify
 * Sequential verification called field-by-field from the scanner UI.
 * Body: { step: 'reference'|'of'|'hu', value, refCode?, ofNumero? }
 *
 * step=reference → checks ReferenceProduit exists (codeReference OR referenceClient)
 * step=of        → checks OrdreFabrication with that numeroOF exists and is EN_COURS,
 *                  and its reference matches refCode sent with the request
 * step=hu        → checks HandlingUnit with that numeroHU exists under the OF (by ofId or ofNumero)
 */
exports.verifyScan = async (req, res) => {
  try {
    const { step, value, refCode, ofNumero, ofId } = req.body;
    if (!step || !value) {
      return res.status(400).json({ ok: false, message: "step et value sont requis" });
    }

    // ── STEP 1: Reference Check ────────────────────────────────────
    if (step === "reference") {
      const ref = await ReferenceProduit.findOne({
        where: sequelize.or(
          { codeReference: value.trim() },
          { referenceClient: value.trim() }
        )
      });

      if (!ref) {
        return res.json({
          ok: false,
          step,
          message: `Référence "${value}" introuvable dans la base de données`,
          code: "REF_NOT_FOUND"
        });
      }

      return res.json({
        ok: true,
        step,
        message: `Référence trouvée: ${ref.codeReference}`,
        data: {
          id: ref.id,
          codeReference: ref.codeReference,
          referenceClient: ref.referenceClient,
          designation: ref.designation
        }
      });
    }

    // ── STEP 2: OF Check ──────────────────────────────────────────
    if (step === "of") {
      const of = await OrdreFabrication.findOne({
        where: { numeroOF: value.trim() },
        include: [{ model: ReferenceProduit, as: "reference" }]
      });

      if (!of) {
        return res.json({
          ok: false,
          step,
          message: `OF "${value}" non trouvé dans la base de données`,
          code: "OF_NOT_FOUND"
        });
      }

      if (of.statut !== "EN_COURS") {
        return res.json({
          ok: false,
          step,
          message: `OF "${value}" n'est pas actif (statut: ${of.statut})`,
          code: "OF_NOT_ACTIVE",
          data: { statut: of.statut }
        });
      }

      // If a reference code was provided, cross-check it
      if (refCode) {
        const normalized = refCode.trim();
        const refMatch =
          normalized === of.reference?.codeReference ||
          normalized === of.reference?.referenceClient;

        if (!refMatch) {
          return res.json({
            ok: false,
            step,
            message: `La référence "${refCode}" ne correspond pas à l'OF "${value}" (attendu: ${of.reference?.codeReference})`,
            code: "REF_OF_MISMATCH"
          });
        }
      }

      return res.json({
        ok: true,
        step,
        message: `OF trouvé et actif`,
        data: {
          id: of.id,
          numeroOF: of.numeroOF,
          statut: of.statut,
          quantiteTotale: of.quantiteTotale,
          reference: {
            codeReference: of.reference?.codeReference,
            referenceClient: of.reference?.referenceClient
          }
        }
      });
    }

    // ── STEP 3: HU Check ──────────────────────────────────────────
    if (step === "hu") {
      // Resolve the OF first (by id or numero)
      let resolvedOfId = ofId;
      if (!resolvedOfId && ofNumero) {
        const of = await OrdreFabrication.findOne({ where: { numeroOF: ofNumero.trim() } });
        if (!of) {
          return res.json({
            ok: false,
            step,
            message: `OF "${ofNumero}" non trouvé`,
            code: "OF_NOT_FOUND"
          });
        }
        resolvedOfId = of.id;
      }

      const hu = await HandlingUnit.findOne({
        where: { numeroHU: value.trim(), ordreFabricationId: resolvedOfId },
        include: [{ model: OrdreFabrication, as: "ordreFabrication", attributes: ["numeroOF"] }]
      });

      if (!hu) {
        // Check if this HU exists in another OF
        const huElsewhere = await HandlingUnit.findOne({
          where: { numeroHU: value.trim() },
          include: [{ model: OrdreFabrication, as: "ordreFabrication", attributes: ["numeroOF"] }]
        });

        if (huElsewhere) {
          return res.json({
            ok: false,
            step,
            message: `HU "${value}" appartient à l'OF "${huElsewhere.ordreFabrication?.numeroOF}" et non à cet OF`,
            code: "HU_WRONG_OF"
          });
        }

        return res.json({
          ok: false,
          step,
          message: `HU "${value}" introuvable dans cet OF`,
          code: "HU_NOT_FOUND"
        });
      }

      if (hu.statut === "VALIDE") {
        return res.json({
          ok: false,
          step,
          message: `HU "${value}" a déjà été scanné et validé`,
          code: "HU_ALREADY_SCANNED",
          data: { statut: hu.statut, quantitePrevue: hu.quantitePrevue }
        });
      }

      return res.json({
        ok: true,
        step,
        message: `HU trouvé sous cet OF`,
        data: {
          id: hu.id,
          numeroHU: hu.numeroHU,
          statut: hu.statut,
          quantitePrevue: hu.quantitePrevue
        }
      });
    }

    return res.status(400).json({ ok: false, message: `Step inconnu: ${step}` });

  } catch (error) {
    console.error("verifyScan error:", error);
    res.status(500).json({ ok: false, message: "Erreur serveur", error: error.message });
  }
};

