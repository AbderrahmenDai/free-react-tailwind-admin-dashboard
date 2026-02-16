const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const HandlingUnit = sequelize.define("HandlingUnit", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  numeroHU: {
    type: DataTypes.STRING,
    allowNull: false,
    // unique: true // Assuming unique globally, but might depend on OF. Let's start with flexible.
  },
  quantitePrevue: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  quantiteReelle: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  statut: {
    type: DataTypes.ENUM("A_SCANNER", "SCANNE", "VALIDE", "REJETE"),
    defaultValue: "A_SCANNER",
    allowNull: false,
  },
  dateScan: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  validationForcee: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  justificationForcage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  qualite: {
    type: DataTypes.ENUM("CONFORME", "NON_CONFORME", "EN_ATTENTE"),
    defaultValue: "CONFORME",
    allowNull: false,
  },
  // Foreign Keys: ordreFabricationId, scannePar (User FK)
});

module.exports = HandlingUnit;
