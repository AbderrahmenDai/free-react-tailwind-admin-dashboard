const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ReferenceProduit = sequelize.define("ReferenceProduit", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  codeReference: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  indice: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  referenceInterne: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  uniteMesure: {
    type: DataTypes.STRING,
    defaultValue: "PC",
  },
  familleProduit: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referenceClient: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  version: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  projet: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referenceClientIndice: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  codeProjet: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  airbagProgramm: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  planificateurDeCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  partNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  compteur: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  shortDescriptionForLabel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  orientation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tempsDeGamme: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  colisage: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  descriptionProjet: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  couleurImpression: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  refClientD2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  refInterneD2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = ReferenceProduit;
