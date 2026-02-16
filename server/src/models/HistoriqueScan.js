const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const HistoriqueScan = sequelize.define("HistoriqueScan", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  dateHeureScan: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  referenceScannee: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quantiteScannee: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  qualiteScannee: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resultatVerification: {
    type: DataTypes.ENUM("SUCCES", "ECHEC"),
    allowNull: false,
  },
  typeErreur: {
    type: DataTypes.ENUM(
      "REFERENCE_INCORRECTE",
      "HU_NON_TROUVE",
      "HU_DEJA_SCANNE",
      "QUANTITE_INCORRECTE", 
      "QUALITE_NON_CONFORME",
      "INDICE_INCORRECT",
      "AUCUNE"
    ),
    defaultValue: "AUCUNE",
  },
  validationForcee: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  donneesGALIA: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  // Foreign Keys: handlingUnitId, ordreFabricationId, operateur (User FK)
});

module.exports = HistoriqueScan;
