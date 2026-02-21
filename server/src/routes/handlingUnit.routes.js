const express = require("express");
const router = express.Router();
const handlingUnitController = require("../controllers/handlingUnit.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// Routes for Handling Units
router.post("/", authenticateToken, handlingUnitController.createHU);
router.put("/:id", authenticateToken, handlingUnitController.updateHU);
router.delete("/:id", authenticateToken, handlingUnitController.deleteHU);

module.exports = router;
