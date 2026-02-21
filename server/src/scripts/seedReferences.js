const { ReferenceProduit } = require("../models");
const sequelize = require("../config/db");

const seedReferences = async () => {
  try {
    console.log("Starting seeding with diverse data...");
    
    // Check connection
    await sequelize.authenticate();
    console.log("Database connected.");

    // clear existing (optional, but good for clean slate if user wants)
    // await ReferenceProduit.destroy({ where: {} }); 

    const references = [];
    const baseCodeRef = 350200800; // Start higher to avoid collision with previous batch
    let baseClientNum = 2525814; 

    // Arrays for randomization
    const projetBases = ["CC21", "CC24", "OV24"];
    const familles = ["L2", "L3", "L4"];
    const variantes = ["RSB", "RSC", "FSC", "FSB"];
    const indices = ["AE", "AF", "AG", "AH", "A01", "B02", "C05"];
    const codeProjets = ["CAV", "DAV", "DAR", "CAR"];
    const couleurs = ["Noir", "Bleu"];

    for (let i = 0; i < 150; i++) {
        const currentCodeRef = (baseCodeRef + i).toString();
        
        // Randomly select attributes
        const projetBase = projetBases[Math.floor(Math.random() * projetBases.length)];
        const famille = familles[Math.floor(Math.random() * familles.length)];
        const variante = variantes[Math.floor(Math.random() * variantes.length)];
        const indice = indices[Math.floor(Math.random() * indices.length)];
        const codeProjet = codeProjets[Math.floor(Math.random() * codeProjets.length)];
        const couleur = couleurs[Math.floor(Math.random() * couleurs.length)];

        // Construct derived fields
        const designation = `CF ${projetBase} ${variante} ${famille}`;
        const nomProjet = `${projetBase} ${famille} ${variante}`;
        const descriptionProjet = `PROJET ${codeProjet}`;
        
        // Airbag program roughly based on project
        const airbagProgramm = `${projetBase}DL02-${codeProjet === 'DAV' ? 'A326D' : 'B450E'}`;

        // Generate Ref Client
        const currentClientNum = baseClientNum + i;
        const currentClientRef = `L00${currentClientNum}NCP`;
        
        // Planificateur: chars 5-10
        const planificateur = currentClientNum.toString(); // Simple extract logic from number

        references.push({
            codeReference: currentCodeRef,
            designation: designation,
            indice: indice,
            referenceInterne: "", 
            uniteMesure: "U",
            familleProduit: famille,
            referenceClient: currentClientRef,
            version: "L02", // Keeping constant for now or could be random
            projet: nomProjet,
            referenceClientIndice: `${currentClientRef}${indice}`,
            codeProjet: codeProjet,
            airbagProgramm: airbagProgramm,
            planificateurDeCode: planificateur, // Using the variable part
            partNumber: "9854468480 00",
            compteur: Math.floor(Math.random() * 1000) + 1, // Random counter
            shortDescriptionForLabel: "",
            orientation: i % 2 === 0 ? "Gauche" : "Droite", // Random orientation
            tempsDeGamme: (Math.random() * (25 - 15) + 15).toFixed(1).replace('.', ','), // Random time
            colisage: Math.floor(Math.random() * (30 - 10) + 10), // Random packing
            descriptionProjet: descriptionProjet,
            couleurImpression: couleur,
            refClientD2: "7358033380",
            refInterneD2: "350738101",
            actif: true
        });
    }

    // Bulk create
    await ReferenceProduit.bulkCreate(references, {
        updateOnDuplicate: ["codeReference"] 
    });

    console.log("Successfully inserted 150 diverse references.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding references:", error);
    process.exit(1);
  }
};

seedReferences();
