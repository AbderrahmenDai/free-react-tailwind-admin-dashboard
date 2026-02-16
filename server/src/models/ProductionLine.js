const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductionLine = sequelize.define("ProductionLine", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // e.g., 'FSB1'
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('FSB', 'RSC', 'RSB', 'FSC'),
    allowNull: false,
  },
  statut: {
    type: DataTypes.ENUM('active', 'maintenance', 'stopped'),
    defaultValue: 'active',
  },
  efficacite: {
    type: DataTypes.FLOAT, // 0-100
    defaultValue: 0,
  }
});

module.exports = ProductionLine;
