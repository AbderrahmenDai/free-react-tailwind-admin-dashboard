const { sequelize, User, ReferenceProduit, OrdreFabrication, HandlingUnit, HistoriqueScan, ProductionLine } = require("./models");

async function seed() {
  try {
    console.log("Syncing database...");
    // Force sync to clear existing data
    await sequelize.sync({ force: true });
    console.log("Database synced!");

    // --- Users ---
    console.log("Seeding Users...");
    const users = await User.bulkCreate([
      {
        username: "admin",
        email: "admin@galia.com",
        password: "admin", // Will be hashed by hook if individualHooks: true
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
      },
      {
        username: "supervisor",
        email: "supervisor@galia.com",
        password: "user",
        firstName: "Supervisor",
        lastName: "User",
        role: "SUPERVISOR",
      },
      {
        username: "operator",
        email: "operator@galia.com",
        password: "user",
        firstName: "Operator",
        lastName: "User",
        role: "OPERATOR",
      },
    ], { individualHooks: true }); // Important for password hashing

    const adminUser = users[0];
    const supervisorUser = users[1];
    const operatorUser = users[2];

    // --- Production Lines ---
    console.log("Seeding Production Lines...");
    const lines = await ProductionLine.bulkCreate([
      { code: "L01", nom: "Ligne Assemblage 1", type: "FSB", statut: "active", efficacite: 85.5, cadence: 120 },
      { code: "L02", nom: "Ligne Peinture A", type: "RSC", statut: "active", efficacite: 92.0, cadence: 80 },
      { code: "L03", nom: "Ligne Test Final", type: "RSB", statut: "maintenance", efficacite: 0, cadence: 0 },
    ]);

    // --- References ---
    console.log("Seeding References...");
    const references = await ReferenceProduit.bulkCreate([
      { codeReference: "REF-001", designation: "Boitier Electronique A", indice: "A", uniteMesure: "PC", familleProduit: "Electroniques" },
      { codeReference: "REF-002", designation: "Support Metal B", indice: "B", uniteMesure: "KG", familleProduit: "Mecanique" },
      { codeReference: "REF-003", designation: "Cable Faisceau C", indice: "A", uniteMesure: "M", familleProduit: "Cablage" },
    ]);

    // --- Ordres de Fabrication (OFs) ---
    console.log("Seeding OFs...");
    const now = new Date();
    const ofs = await OrdreFabrication.bulkCreate([
      {
        numeroOF: "OF-2023-001",
        quantiteTotale: 100,
        statut: "EN_COURS",
        referenceId: references[0].id,
        productionLineId: lines[0].id,
        createdBy: supervisorUser.id,
        dateCreation: now,
      },
      {
        numeroOF: "OF-2023-002",
        quantiteTotale: 50,
        statut: "EN_COURS",
        referenceId: references[1].id,
        productionLineId: lines[1].id,
        createdBy: supervisorUser.id,
        dateCreation: new Date(now.getTime() - 86400000), // Yesterday
      },
      {
        numeroOF: "OF-2023-003",
        quantiteTotale: 200,
        statut: "TERMINE",
        referenceId: references[2].id,
        productionLineId: lines[0].id,
        createdBy: adminUser.id,
        dateCreation: new Date(now.getTime() - 172800000), // 2 days ago
        dateCloture: now,
      },
    ]);

    // --- Handling Units (HUs) ---
    console.log("Seeding HUs...");
    const hus = [];
    
    // OF 1: 5 HUs of 20
    for (let i = 1; i <= 5; i++) {
        hus.push({
            numeroHU: `HU-001-${i.toString().padStart(3, '0')}`,
            quantitePrevue: 20,
            quantiteReelle: i <= 2 ? 20 : 0, // First 2 scanned
            statut: i <= 2 ? "VALIDE" : "A_SCANNER",
            qualite: "CONFORME",
            ordreFabricationId: ofs[0].id,
            scannePar: i <= 2 ? operatorUser.id : null,
            dateScan: i <= 2 ? new Date() : null,
        });
    }

    // OF 2: 2 HUs of 25
    for (let i = 1; i <= 2; i++) {
        hus.push({
            numeroHU: `HU-002-${i.toString().padStart(3, '0')}`,
            quantitePrevue: 25,
            quantiteReelle: 0,
            statut: "A_SCANNER",
            qualite: "CONFORME",
            ordreFabricationId: ofs[1].id,
        });
    }

    await HandlingUnit.bulkCreate(hus);

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await sequelize.close();
  }
}

seed();
