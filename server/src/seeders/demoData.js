const { 
  ProductionLine, 
  ReferenceProduit, 
  OrdreFabrication, 
  HandlingUnit, 
  HistoriqueScan, 
  sequelize 
} = require("../models");

async function seedDemoData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log("Seeding demo data...");

    // 1. Create Production Lines
    const lines = await ProductionLine.bulkCreate([
      { code: "L1", nom: "Ligne Assemblage 1", type: "FSB", statut: "active", efficacite: 95, cadence: 150, objectif: 1200 },
      { code: "L2", nom: "Ligne Assemblage 2", type: "RSC", statut: "active", efficacite: 88, cadence: 140, objectif: 1100 },
      { code: "L3", nom: "Presse Injection 1", type: "RSB", statut: "active", efficacite: 92, cadence: 200, objectif: 1600 },
      { code: "L4", nom: "Contrôle Qualité A", type: "D34", statut: "active", efficacite: 98, cadence: 300, objectif: 2400 },
      { code: "L5", nom: "Ligne Robotique X", type: "FSC", statut: "maintenance", efficacite: 0, cadence: 0, objectif: 0 }
    ], { transaction, ignoreDuplicates: true }); // Avoid error if exists

    // 2. Create References
    const refs = await ReferenceProduit.bulkCreate([
      { codeReference: "REF-001", designation: "Boitier Plastique A", indice: "A", uniteMesure: "PCE", actif: true },
      { codeReference: "REF-002", designation: "Connecteur 12V", indice: "B", uniteMesure: "PCE", actif: true },
      { codeReference: "REF-003", designation: "Support Métal", indice: "C", uniteMesure: "PCE", actif: true },
      { codeReference: "REF-004", designation: "Capteur Pression", indice: "A", uniteMesure: "PCE", actif: true },
    ], { transaction, ignoreDuplicates: true });

    // 3. Create OFs (Production Orders)
    const activeLines = await ProductionLine.findAll({ where: { statut: 'active' }, transaction });
    const allRefs = await ReferenceProduit.findAll({ transaction });
    
    const ofs = [];
    for (const line of activeLines) {
      // Create 2 OFs per line
      for (let i = 1; i <= 2; i++) {
        const ref = allRefs[Math.floor(Math.random() * allRefs.length)];
        ofs.push({
            numeroOF: `OF-${line.code}-00${i}-${Date.now().toString().slice(-4)}`,
            quantiteTotale: 5000,
            statut: "EN_COURS",
            productionLineId: line.id,
            referenceId: ref.id,
            createdBy: null // Assuming no user for demo seed
        });
      }
    }
    
    const createdOFs = await OrdreFabrication.bulkCreate(ofs, { transaction });

    // 4. Generate Scans (History) for Today
    // We simulate scans for shifts: Matin (06-14), PM (14-22), Nuit (22-06)
    const scans = [];
    const now = new Date();
    // Start from yesterday 06:00 to ensure we cover full production day context if needed
    const startTimeHash = new Date(now);
    startTimeHash.setDate(startTimeHash.getDate() - 1); 
    startTimeHash.setHours(6, 0, 0, 0);

    const endTime = new Date(now); // Up to now

    // Helper to add random minutes
    const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

    for (const ofOrder of createdOFs) {
        let currentTime = new Date(startTimeHash);
        let count = 0;
        
        while (currentTime < endTime && count < 200) { // Limit scans per OF
            // Randomize success/fail
            const isSuccess = Math.random() > 0.05; // 95% success rate
            
            scans.push({
                dateHeureScan: currentTime,
                referenceScannee: "DEMO-REF",
                quantiteScannee: 1,
                qualiteScannee: "OK",
                resultatVerification: isSuccess ? "SUCCES" : "ECHEC",
                typeErreur: isSuccess ? "AUCUNE" : "REFERENCE_INCORRECTE", 
                ordreFabricationId: ofOrder.id,
                // handlingUnitId: null, 
                // operateur: null
            });

            // Avance time by random 2-10 minutes
            currentTime = addMinutes(currentTime, 2 + Math.floor(Math.random() * 8));
            count++;
        }
    }

    // Insert Scans in chunks to avoid memory issues if too many
    const chunkSize = 500;
    for (let i = 0; i < scans.length; i += chunkSize) {
        await HistoriqueScan.bulkCreate(scans.slice(i, i + chunkSize), { transaction });
    }

    await transaction.commit();
    console.log("Demo data seeded successfully!");
  } catch (error) {
    await transaction.rollback();
    console.error("Error seeding demo data:", error);
  }
}

seedDemoData().then(() => {
    process.exit();
});
