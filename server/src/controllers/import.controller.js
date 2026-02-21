const multer = require("multer");
const xlsx = require("xlsx");
const { Op } = require("sequelize");
const { OrdreFabrication, HandlingUnit, ReferenceProduit } = require("../models");

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

        // Bulk Create with auto-incremented compteurHU
        // Get current MAX compteurHU per OF to continue numbering
        const ofIds = [...new Set(data.map(item => item.ordreFabricationId))];
        const maxCounters = {};
        for (const ofId of ofIds) {
            const maxVal = await HandlingUnit.max('compteurHU', { where: { ordreFabricationId: ofId }, transaction: t });
            maxCounters[ofId] = maxVal != null ? Number(maxVal) : 0;
        }

        await HandlingUnit.bulkCreate(data.map(item => {
            maxCounters[item.ordreFabricationId] = (maxCounters[item.ordreFabricationId] || 0) + 1;
            return {
                numeroHU: item.numeroHU,
                quantitePrevue: item.quantitePrevue,
                ordreFabricationId: item.ordreFabricationId,
                statut: "A_SCANNER",
                quantiteReelle: 0,
                compteurHU: maxCounters[item.ordreFabricationId],
            };
        }), { transaction: t });

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

exports.generateReferenceTemplate = (req, res) => {
    const wb = xlsx.utils.book_new();
    const headers = ["CodeReference", "Designation", "Indice", "ReferenceInterne", "UniteMesure", "FamilleProduit"];
    const exampleData = [
        { CodeReference: "REF-001", Designation: "Produit A", Indice: "A", ReferenceInterne: "INT-001", UniteMesure: "U", FamilleProduit: "Famille 1" },
        { CodeReference: "REF-002", Designation: "Produit B", Indice: "B", ReferenceInterne: "", UniteMesure: "KG", FamilleProduit: "" },
    ];

    const ws = xlsx.utils.json_to_sheet(exampleData, { header: headers });

    // Set column widths
    ws["!cols"] = [
        { wch: 20 }, // CodeReference
        { wch: 30 }, // Designation
        { wch: 10 }, // Indice
        { wch: 20 }, // ReferenceInterne
        { wch: 10 }, // UniteMesure
        { wch: 20 }, // FamilleProduit
    ];

    xlsx.utils.book_append_sheet(wb, ws, "References");

    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.attachment("Modele_Import_References.xlsx");
    res.send(buffer);
};

exports.previewReferenceImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        const wb = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = wb.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

        const validatedData = [];
        const errors = [];
        const warnings = [];

        // Fetch existing refs to check duplicates
        const existingRefs = await ReferenceProduit.findAll({ attributes: ["codeReference"] });
        const existingRefSet = new Set(existingRefs.map(r => r.codeReference));
        const fileRefSet = new Set();

        if (rawData.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Trop de lignes (> 2000)",
                errors: ["E-005: Trop de lignes (> 2000)"]
            });
        }

        rawData.forEach((row, index) => {
            const lineNum = index + 2;
            const codeRef = row["CodeReference"] || row["codeReference"];
            const designation = row["Designation"] || row["designation"];
            const indice = row["Indice"] || row["indice"];
            const refInterne = row["ReferenceInterne"] || row["referenceInterne"] || "";
            let unite = row["UniteMesure"] || row["uniteMesure"] || "U";
            const famille = row["FamilleProduit"] || row["familleProduit"] || "";

            const rowErrors = [];
            const rowWarnings = [];

            if (!codeRef) rowErrors.push(`Ligne ${lineNum}: Code Référence manquant`);
            if (!designation) rowErrors.push(`Ligne ${lineNum}: Désignation manquante`);
            if (!indice) rowErrors.push(`Ligne ${lineNum}: Indice manquant`);

            // Duplicates
            if (codeRef) {
                if (fileRefSet.has(codeRef)) {
                    rowErrors.push(`Ligne ${lineNum}: Doublon dans le fichier (${codeRef})`);
                } else {
                    fileRefSet.add(codeRef);
                }

                if (existingRefSet.has(codeRef)) {
                    rowErrors.push(`Ligne ${lineNum}: Existe déjà en base (${codeRef})`);
                }
            }
            
            // Unite validation
            if (!["U", "KG", "M"].includes(unite)) {
                rowWarnings.push(`Ligne ${lineNum}: Unité inconnue (${unite}), défaut 'U' appliqué`);
                unite = "U";
            }

            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
            } else {
                if (rowWarnings.length > 0) warnings.push(...rowWarnings);
                validatedData.push({
                    codeReference: codeRef,
                    designation,
                    indice,
                    referenceInterne: refInterne,
                    uniteMesure: unite,
                    familleProduit: famille,
                    warnings: rowWarnings
                });
            }
        });

        res.json({
            success: errors.length === 0,
            totalLines: rawData.length,
            validLines: validatedData.length,
            errors,
            warnings,
            previewData: validatedData
        });

    } catch (error) {
        console.error("Preview error:", error);
        res.status(500).json({ message: "Erreur lors de l'analyse", error: error.message });
    }
};

exports.confirmReferenceImport = async (req, res) => {
    const t = await ReferenceProduit.sequelize.transaction();
    try {
        const { data } = req.body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "Aucune donnée à importer" });
        }

        await ReferenceProduit.bulkCreate(data, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, count: data.length, message: `${data.length} Références importées` });
    } catch (error) {
        await t.rollback();
        console.error("Import error:", error);
        res.status(500).json({ message: "Erreur lors de l'import", error: error.message });
    }
};

// ─── OF Import ────────────────────────────────────────────────────────────────

exports.generateOfTemplate = (req, res) => {
    const wb = xlsx.utils.book_new();
    const headers = ["OF", "HU", "IDType", "Created by", "Changed by", "Ob", "Object key", "WhN", "Pkg instr.", "Time", "HUGR1", "HUGR2", "Created on", "Changed on"];
    const exampleData = [
        { "OF": "2318600", "HU": "827228800", "IDType": "E", "Created by": "UTN92005", "Changed by": "", "Ob": "09", "Object key": "000002318541", "WhN": "35C", "Pkg instr.": "Z350200700", "Time": "12:48:51", "HUGR1": "", "HUGR2": "", "Created on": "2/14/2026", "Changed on": "2/14/2026" },
        { "OF": "2318600", "HU": "827228801", "IDType": "E", "Created by": "UTN92005", "Changed by": "", "Ob": "09", "Object key": "000002318541", "WhN": "35C", "Pkg instr.": "Z350200700", "Time": "12:48:51", "HUGR1": "", "HUGR2": "", "Created on": "2/14/2026", "Changed on": "2/14/2026" },
    ];
    const ws = xlsx.utils.json_to_sheet(exampleData, { header: headers });
    ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 2, 14) }));
    xlsx.utils.book_append_sheet(wb, ws, "OF_HU");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.attachment("Modele_Import_OF.xlsx");
    res.send(buffer);
};

exports.previewOfImport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Aucun fichier fourni" });

        const wb = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = wb.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

        if (rawData.length > 5000) {
            return res.status(400).json({ success: false, message: "Trop de lignes (> 5000)", errors: ["E-005"] });
        }

        const errors = [];
        const warnings = [];
        // Map: ofNumber -> { ofData, hus[] }
        const ofMap = new Map();

        // Fetch existing OFs and HUs for duplicate checks
        const existingOFs = await OrdreFabrication.findAll({ attributes: ["numeroOF"] });
        const existingOfSet = new Set(existingOFs.map(o => String(o.numeroOF)));
        const existingHUs = await HandlingUnit.findAll({ attributes: ["numeroHU"] });
        const existingHuSet = new Set(existingHUs.map(h => String(h.numeroHU)));
        const fileHuSet = new Set();

        // ── SAP carry-forward: OF number is only on the first row of each group
        let lastOfNum = "";

        rawData.forEach((row, index) => {
            const lineNum = index + 2;

            // Carry-forward: use last seen OF if current cell is blank (SAP merged-cell export)
            const rawOfNum = String(row["OF"] || "").trim();
            const ofNum = rawOfNum || lastOfNum;
            if (rawOfNum) lastOfNum = rawOfNum;  // update carry-forward when a new OF appears

            const huNum = String(row["HU"] || "").trim();
            const idType = String(row["IDType"] || "E").trim();
            const createdBy = String(row["Created by"] || "").trim();
            const ob = String(row["Ob"] || "").trim();
            const objectKey = String(row["Object key"] || "").trim();
            const whN = String(row["WhN"] || "").trim();
            const pkgInstr = String(row["Pkg instr."] || "").trim();

            const rowErrors = [];

            if (!ofNum) rowErrors.push(`Ligne ${lineNum}: N° OF manquant`);
            if (!huNum) rowErrors.push(`Ligne ${lineNum}: N° HU manquant`);

            if (huNum) {
                if (fileHuSet.has(huNum)) {
                    rowErrors.push(`Ligne ${lineNum}: HU ${huNum} en doublon dans le fichier`);
                } else {
                    fileHuSet.add(huNum);
                }
                if (existingHuSet.has(huNum)) {
                    warnings.push(`Ligne ${lineNum}: HU ${huNum} existe déjà — sera ignoré`);
                }
            }

            // Only warn once per OF about existing OF (don't repeat for every HU row)
            if (ofNum && rawOfNum && existingOfSet.has(ofNum)) {
                warnings.push(`OF ${ofNum} existe déjà — HUs seront ajoutés à l'OF existant`);
            }

            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
                return;
            }

            if (!ofMap.has(ofNum)) {
                ofMap.set(ofNum, {
                    numeroOF: ofNum,
                    whN,
                    pkgInstr,
                    ob,
                    objectKey,
                    createdByUsername: createdBy,
                    alreadyExists: existingOfSet.has(ofNum),
                    hus: []
                });
            }

            if (!existingHuSet.has(huNum)) {
                ofMap.get(ofNum).hus.push({
                    numeroHU: huNum,
                    idType,
                    statut: "A_SCANNER",
                    quantiteReelle: 0,
                    quantitePrevue: 1
                });
            }
        });

        const previewData = Array.from(ofMap.values());
        const totalHus = previewData.reduce((acc, o) => acc + o.hus.length, 0);

        res.json({
            success: errors.length === 0,
            totalLines: rawData.length,
            totalOFs: previewData.length,
            totalHUs: totalHus,
            errors,
            warnings,
            previewData
        });
    } catch (error) {
        console.error("OF preview error:", error);
        res.status(500).json({ message: "Erreur lors de l'analyse", error: error.message });
    }
};

exports.confirmOfImport = async (req, res) => {
    const t = await OrdreFabrication.sequelize.transaction();
    try {
        const { data, referenceId } = req.body;
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "Aucune donnée à importer" });
        }

        let totalHUs = 0;
        let totalOFs = 0;

        // —— Global counter per reference: find MAX(compteurHU) across ALL OFs with same referenceId
        let globalCounter = 0;
        if (referenceId) {
            const existingOFs = await OrdreFabrication.findAll({
                where: { referenceId },
                attributes: ['id'],
                transaction: t,
            });
            if (existingOFs.length > 0) {
                const existingOfIds = existingOFs.map(o => o.id);
                const maxVal = await HandlingUnit.max('compteurHU', {
                    where: { ordreFabricationId: { [Op.in]: existingOfIds } },
                    transaction: t,
                });
                globalCounter = maxVal != null ? Number(maxVal) : 0;
            }
        }

        for (const ofData of data) {
            let of;
            if (ofData.alreadyExists) {
                of = await OrdreFabrication.findOne({ where: { numeroOF: ofData.numeroOF }, transaction: t });
            } else {
                // —— Tenter une liaison automatique par pkgInstr if no referenceId provided
                let finalReferenceId = referenceId || null;
                if (!finalReferenceId && ofData.pkgInstr) {
                    const matchedRef = await ReferenceProduit.findOne({ 
                        where: { codeReference: ofData.pkgInstr },
                        transaction: t 
                    });
                    if (matchedRef) finalReferenceId = matchedRef.id;
                }

                of = await OrdreFabrication.create({
                    numeroOF: ofData.numeroOF,
                    quantiteTotale: ofData.hus.length || 1,
                    statut: "EN_COURS",
                    whN: ofData.whN || null,
                    pkgInstr: ofData.pkgInstr || null,
                    ob: ofData.ob || null,
                    objectKey: ofData.objectKey || null,
                    referenceId: finalReferenceId,
                    createdBy: req.user.id
                }, { transaction: t });
                totalOFs++;
            }

            if (of && ofData.hus && ofData.hus.length > 0) {
                // Use shared globalCounter so all OFs in this reference get unique sequential numbers
                await HandlingUnit.bulkCreate(
                    ofData.hus.map(hu => {
                        globalCounter++;
                        return {
                            numeroHU: hu.numeroHU,
                            statut: "A_SCANNER",
                            quantiteReelle: 0,
                            quantitePrevue: hu.quantitePrevue || 1,
                            ordreFabricationId: of.id,
                            compteurHU: globalCounter,
                        };
                    }),
                    { transaction: t, ignoreDuplicates: true }
                );
                totalHUs += ofData.hus.length;
            }
        }

        // —— Sync ReferenceProduit.compteur with the final globalCounter
        if (referenceId && globalCounter > 0) {
            await ReferenceProduit.update(
                { compteur: globalCounter },
                { where: { id: referenceId }, transaction: t }
            );
        }

        await t.commit();
        res.status(201).json({
            success: true,
            message: `${totalOFs} OF(s) créé(s), ${totalHUs} HU(s) importé(s)`,
            totalOFs,
            totalHUs
        });
    } catch (error) {
        await t.rollback();
        console.error("OF import error:", error);
        res.status(500).json({ message: "Erreur lors de l'import", error: error.message });
    }
};
