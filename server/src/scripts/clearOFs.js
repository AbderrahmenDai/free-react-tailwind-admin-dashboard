/**
 * clearOFs.js — Supprime tous les OFs et HUs de la base (données de seed)
 * Usage : node server/src/scripts/clearOFs.js
 */
const { OrdreFabrication, HandlingUnit } = require("../models");
const sequelize = require("../config/db");

const clearOFs = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Base de données connectée");

    const huCount = await HandlingUnit.count();
    const ofCount = await OrdreFabrication.count();
    console.log(`📊 Trouvé : ${ofCount} OFs et ${huCount} HUs`);

    // Supprimer HUs en premier (contrainte FK)
    await HandlingUnit.destroy({ where: {} });
    console.log("🗑️  HUs supprimés");

    await OrdreFabrication.destroy({ where: {} });
    console.log("🗑️  OFs supprimés");

    console.log("✅ Base vidée avec succès — vous pouvez maintenant importer vos vrais fichiers SAP");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
    process.exit(1);
  }
};

clearOFs();
