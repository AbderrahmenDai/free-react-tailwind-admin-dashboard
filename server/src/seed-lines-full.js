
require("dotenv").config();
const { sequelize, ProductionLine } = require("./models");

const linesToCreate = [
  // 2 lines D34
  { code: "D34-1", nom: "Ligne D34 1", type: "D34" },
  { code: "D34-2", nom: "Ligne D34 2", type: "D34" },

  // 5 lines FSB
  { code: "FSB-1", nom: "Ligne FSB 1", type: "FSB" },
  { code: "FSB-2", nom: "Ligne FSB 2", type: "FSB" },
  { code: "FSB-3", nom: "Ligne FSB 3", type: "FSB" },
  { code: "FSB-4", nom: "Ligne FSB 4", type: "FSB" },
  { code: "FSB-5", nom: "Ligne FSB 5", type: "FSB" },

  // 5 lines FSC
  { code: "FSC-1", nom: "Ligne FSC 1", type: "FSC" },
  { code: "FSC-2", nom: "Ligne FSC 2", type: "FSC" },
  { code: "FSC-3", nom: "Ligne FSC 3", type: "FSC" },
  { code: "FSC-4", nom: "Ligne FSC 4", type: "FSC" },
  { code: "FSC-5", nom: "Ligne FSC 5", type: "FSC" },

  // 4 lines RSB
  { code: "RSB-1", nom: "Ligne RSB 1", type: "RSB" },
  { code: "RSB-2", nom: "Ligne RSB 2", type: "RSB" },
  { code: "RSB-3", nom: "Ligne RSB 3", type: "RSB" },
  { code: "RSB-4", nom: "Ligne RSB 4", type: "RSB" },

  // 3 lines RSC
  { code: "RSC-1", nom: "Ligne RSC 1", type: "RSC" },
  { code: "RSC-2", nom: "Ligne RSC 2", type: "RSC" },
  { code: "RSC-3", nom: "Ligne RSC 3", type: "RSC" },
];

async function seedLines() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    // Sync to ensure new ENUM value is accepted (might need more depending on DB but sequelize.sync({alter:true}) usually handles it in server.js, here we just use it)
    // Actually, sync({ alter: true }) logic is in server.js. This script runs standalone.
    // If we run this script, we might want to sync too to be safe about the ENUM update.
    await sequelize.sync({ alter: true });
    console.log("Database synced.");

    for (const line of linesToCreate) {
      const [pd, created] = await ProductionLine.findOrCreate({
        where: { code: line.code },
        defaults: line
      });
      
      if (!created) {
        await pd.update(line);
        console.log(`Updated line: ${line.code}`);
      } else {
        console.log(`Created line: ${line.code}`);
      }
    }

    console.log("Production lines seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding lines:", error);
    process.exit(1);
  }
}

seedLines();
