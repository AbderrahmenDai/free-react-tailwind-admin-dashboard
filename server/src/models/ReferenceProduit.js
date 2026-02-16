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
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = ReferenceProduit;
