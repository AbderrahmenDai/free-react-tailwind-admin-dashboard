const router = require("express").Router();
const controller = require("../controllers/productionLine.controller");

router.get("/", controller.getAllLines);
router.get("/:lineId/stats", controller.getLineStats);
router.get("/seed", controller.seedLines); // For dev 

module.exports = router;
