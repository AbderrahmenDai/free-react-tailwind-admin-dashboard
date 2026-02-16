const sequelize = require("../config/db");
const User = require("./User");
const ReferenceProduit = require("./ReferenceProduit");
const OrdreFabrication = require("./OrdreFabrication");
const HandlingUnit = require("./HandlingUnit");
const HistoriqueScan = require("./HistoriqueScan");
const ProductionLine = require("./ProductionLine");

// Associations

// ProductionLine -> OrdreFabrication (1:N)
ProductionLine.hasMany(OrdreFabrication, { foreignKey: "productionLineId", as: "ofs" });
OrdreFabrication.belongsTo(ProductionLine, { foreignKey: "productionLineId", as: "line" });

// User -> OrdreFabrication (Creator)
User.hasMany(OrdreFabrication, { foreignKey: "createdBy", as: "createdOFs" });
OrdreFabrication.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

// ReferenceProduit -> OrdreFabrication
ReferenceProduit.hasMany(OrdreFabrication, { foreignKey: "referenceId", as: "ofs" });
OrdreFabrication.belongsTo(ReferenceProduit, { foreignKey: "referenceId", as: "reference" });

// OrdreFabrication -> HandlingUnit (1:N)
OrdreFabrication.hasMany(HandlingUnit, { foreignKey: "ordreFabricationId", as: "handlingUnits" });
HandlingUnit.belongsTo(OrdreFabrication, { foreignKey: "ordreFabricationId", as: "ordreFabrication" });

// User -> HandlingUnit (Scanner)
User.hasMany(HandlingUnit, { foreignKey: "scannePar", as: "scannedHUs" });
HandlingUnit.belongsTo(User, { foreignKey: "scannePar", as: "scanneur" });

// HandlingUnit -> HistoriqueScan (1:N)
HandlingUnit.hasMany(HistoriqueScan, { foreignKey: "handlingUnitId", as: "scanHistory" });
HistoriqueScan.belongsTo(HandlingUnit, { foreignKey: "handlingUnitId", as: "handlingUnit" });

// OrdreFabrication -> HistoriqueScan (1:N)
OrdreFabrication.hasMany(HistoriqueScan, { foreignKey: "ordreFabricationId", as: "ofHistory" });
HistoriqueScan.belongsTo(OrdreFabrication, { foreignKey: "ordreFabricationId", as: "ordreFabrication" });

// User -> HistoriqueScan (Operator)
User.hasMany(HistoriqueScan, { foreignKey: "operateur", as: "scanOperations" });
HistoriqueScan.belongsTo(User, { foreignKey: "operateur", as: "operator" });

module.exports = {
  sequelize,
  User,
  ReferenceProduit,
  OrdreFabrication,
  HandlingUnit,
  HistoriqueScan,
  ProductionLine,
};
