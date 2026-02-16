const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrdreFabrication = sequelize.define("OrdreFabrication", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  numeroOF: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  quantiteTotale: {
    type: DataTypes.INTEGER,
    validate: { min: 1 },
    allowNull: false,
  },
  dateCreation: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  dateCloture: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  statut: {
    type: DataTypes.ENUM("EN_COURS", "TERMINE", "ANNULE"),
    defaultValue: "EN_COURS",
    allowNull: false,
  },
  // Foreign Keys: referenceId, createdBy will be handled via associations
});

module.exports = OrdreFabrication;
