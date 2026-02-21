const router = require("express").Router();
const controller = require("../controllers/productionLine.controller");

router.get("/type-stats", controller.getStatsByType);
router.get("/", controller.getAllLines);
router.post("/", controller.createLine);
router.get("/:lineId/stats", controller.getLineStats);
router.put("/:lineId", controller.updateLine);
router.delete("/:lineId", controller.deleteLine);
router.get("/seed", controller.seedLines); // For dev 

module.exports = router;
