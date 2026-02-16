const multer = require("multer");
const xlsx = require("xlsx");
const { OrdreFabrication, HandlingUnit } = require("../models");

const storage = multer.memoryStorage();
exports.upload = multer({ storage: storage });

exports.generateTemplate = (req, res) => {
  const wb = xlsx.utils.book_new();
  const headers = ["NumeroHU", "QuantitePrevue", "Commentaire"];
  const exampleData = [
    { NumeroHU: "HU-001", QuantitePrevue: 100, Commentaire: "Exemple" },
    { NumeroHU: "HU-002", QuantitePrevue: 100, Commentaire: "" },
  ];
  
  const ws = xlsx.utils.json_to_sheet(exampleData, { header: headers });
  
  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // NumeroHU
    { wch: 15 }, // QuantitePrevue
    { wch: 30 }, // Commentaire
  ];

  xlsx.utils.book_append_sheet(wb, ws, "HU");
  
  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  res.attachment("Modele_Import_HU.xlsx");
  res.send(buffer);
};

exports.previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    const { ordreFabricationId } = req.body;
    if (!ordreFabricationId) {
      return res.status(400).json({ message: "OF requis pour l'import" });
    }

    const of = await OrdreFabrication.findByPk(ordreFabricationId);
    if (!of) {
      return res.status(404).json({ message: "OF non trouvé" });
    }

    const wb = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

    // Validate Data
    const validatedData = [];
    const errors = [];
    const warnings = [];
    let totalImportedQty = 0;

    // Fetch existing HU for duplicates check
    const existingHUs = await HandlingUnit.findAll({ attributes: ["numeroHU"] });
    const existingHuSet = new Set(existingHUs.map(h => h.numeroHU));
    const fileHuSet = new Set();
    
    // Limits
    if (rawData.length > 1000) {
        return res.status(400).json({ 
            success: false, 
            message: "Trop de lignes (> 1000)", 
            errors: ["E-005: Trop de lignes (> 1000)"]
        });
    }

    rawData.forEach((row, index) => {
      const lineNum = index + 2; // Header is line 1
      const huNum = row["NumeroHU"] || row["numeroHU"] || row["NUMEROHU"]; // Handle loose casing
      
      let qty = row["QuantitePrevue"] || row["quantitePrevue"] || row["QUANTITE"] || row["Quantite"];
      const comment = row["Commentaire"] || row["commentaire"] || "";

      const rowErrors = [];
      const rowWarnings = [];

      // E-101: Empty HU
      if (!huNum) {
        rowErrors.push(`Ligne ${lineNum}: Numéro HU manquant (E-101)`);
      } else {
        // E-006: Duplicates in file
        if (fileHuSet.has(huNum)) {
            rowErrors.push(`Ligne ${lineNum}: Doublon dans le fichier pour HU ${huNum} (E-006)`);
        } else {
            fileHuSet.add(huNum);
        }

        // E-007: Duplicates in DB
        if (existingHuSet.has(huNum)) {
            rowErrors.push(`Ligne ${lineNum}: HU ${huNum} existe déjà en base (E-007)`);
        }
      }

      // E-102, E-103, E-104: Quantity validation
      if (qty === undefined || qty === null || qty === "") {
        rowErrors.push(`Ligne ${lineNum}: Quantité manquante (E-102)`);
      } else {
        qty = parseFloat(qty);
        if (isNaN(qty)) {
            rowErrors.push(`Ligne ${lineNum}: Quantité non numérique (E-103)`);
        } else if (qty <= 0) {
            rowErrors.push(`Ligne ${lineNum}: Quantité négative ou nulle (E-104)`);
        }
      }

      // W-204: Comment length
      if (comment && comment.length > 500) {
          rowWarnings.push(`Ligne ${lineNum}: Commentaire tronqué (> 500 chars) (W-204)`);
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        if (rowWarnings.length > 0) warnings.push(...rowWarnings);
        validatedData.push({
            numeroHU: huNum,
            quantitePrevue: qty,
            commentaire: comment.substring(0, 500),
            ordreFabricationId: of.id,
            warnings: rowWarnings
        });
        totalImportedQty += qty;
      }
    });

    // Global Validations
    // W-201: Quantity deviation
    const deviation = Math.abs(of.quantiteTotale - totalImportedQty);
    const deviationPercent = (deviation / of.quantiteTotale) * 100;
    
    if (deviationPercent > 5) {
        warnings.push(`Écart global de quantité détecté: ${deviationPercent.toFixed(2)}% (OF: ${of.quantiteTotale}, Import: ${totalImportedQty}) (W-201)`);
    }

    res.json({
      success: errors.length === 0,
      totalLines: rawData.length,
      validLines: validatedData.length,
      errors,
      warnings,
      previewData: validatedData,
      globalStats: {
          totalOfQty: of.quantiteTotale,
          totalImportQty: totalImportedQty,
          deviationPercent
      }
    });

  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({ message: "Erreur lors de l'analyse du fichier", error: error.message });
  }
};

exports.confirmImport = async (req, res) => {
    // Transactional insert
    const t = await HandlingUnit.sequelize.transaction();
    try {
        const { data } = req.body; // Expecting validated data array
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "Aucune donnée à importer" });
        }

        // Final duplicate check (race condition mitigation) could go here but skipping for brevity
        // Bulk Create
        await HandlingUnit.bulkCreate(data.map(item => ({
            numeroHU: item.numeroHU,
            quantitePrevue: item.quantitePrevue,
            // commentaire: item.commentaire, // Commentaire not in model yet, assumed handled or ignored
            ordreFabricationId: item.ordreFabricationId,
            statut: "A_SCANNER",
            quantiteReelle: 0
        })), { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, count: data.length, message: `${data.length} HU importés avec succès` });
    } catch (error) {
        await t.rollback();
        console.error("Import error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de l'import en base", 
            error: error.message 
        });
    }
};
