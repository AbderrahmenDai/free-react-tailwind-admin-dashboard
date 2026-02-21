const { OrdreFabrication, ReferenceProduit, HandlingUnit, User } = require("../models");
const sequelize = require("../config/db");

const seedOFs = async () => {
  try {
    console.log("Starting OF seeding...");
    await sequelize.authenticate();
    console.log("Database connected.");

    // Clean up existing data to avoid clutter
    console.log("Cleaning old OFs and HUs...");
    // We destroy HUs first to avoid FK constraints if cascade isn't set up perfectly in DB
    await HandlingUnit.destroy({ where: {} }); 
    await OrdreFabrication.destroy({ where: {} });

    // Fetch all references
    const references = await ReferenceProduit.findAll();
    console.log(`Found ${references.length} references.`);

    if (references.length === 0) {
        console.log("No references found. Please run seedReferences.js first.");
        process.exit(1);
    }

    let ofCounter = 2318600;
    let huCounter = 827228800;

    const ofsToCreate = [];
    const husToCreate = [];

    // Valid 'createdUser' - assuming a string based on the screenshot "UTN92005"
    // In a real app this would be a UUID from Users table, but user screenshot shows "UTN92005"
    // and the model allows string for createdUser/changedUser in HandlingUnit.
    // For OrdreFabrication, createdBy is usually a User ID. 
    // Let's check if we have any user.
    const user = await User.findOne();
    const userId = user ? user.id : null;

    for (const ref of references) {
        // Create 1 OF per reference
        const currentOFNum = ofCounter.toString();
        const objectKey = currentOFNum.padStart(12, '0'); // 000002318600
        
        // Random quantity: between 50 and 500
        const quantiteTotale = Math.floor(Math.random() * (500 - 50 + 1) + 50);
        
        // Pkg Instr: Z + Code Reference
        const pkgInstr = `Z${ref.codeReference}`;

        // Prepare OF
        // We will create OFs sequentially to get their IDs for HUs
        // Bulk creating OFs then mapping might be faster but complex to link HUs.
        // We'll stick to loop for clarity and reliability.
        
        const of = await OrdreFabrication.create({
            numeroOF: currentOFNum,
            referenceId: ref.id,
            quantiteTotale: quantiteTotale,
            statut: "EN_COURS",
            whN: "35C",
            pkgInstr: pkgInstr,
            ob: "09",
            objectKey: objectKey,
            createdBy: userId // Use a valid user ID if possible
        });

        // Generate HUs for this OF
        const colisage = ref.colisage || 10;
        const numberOfHUs = Math.ceil(quantiteTotale / colisage);

        for (let j = 0; j < numberOfHUs; j++) {
            const currentHU = huCounter.toString();
            
            // Calculate quantity for this HU
            let qty = colisage;
            if (j === numberOfHUs - 1) {
                const remainder = quantiteTotale % colisage;
                if (remainder !== 0) qty = remainder;
            }

            husToCreate.push({
                numeroHU: currentHU,
                ordreFabricationId: of.id,
                quantitePrevue: qty,
                quantiteReelle: 0,
                statut: "A_SCANNER",
                idType: "E",
                createdUser: "UTN92005",
                changedUser: null, 
                qualite: "CONFORME"
            });

            huCounter++;
        }
        
        ofCounter++;
        
        if (husToCreate.length > 500) {
            await HandlingUnit.bulkCreate(husToCreate);
            husToCreate.length = 0; // Clear array
        }
    }

    // Insert remaining HUs
    if (husToCreate.length > 0) {
        await HandlingUnit.bulkCreate(husToCreate);
    }

    console.log(`Successfully seeded ${references.length} OFs and their HUs.`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding OFs:", error);
    process.exit(1);
  }
};

seedOFs();
