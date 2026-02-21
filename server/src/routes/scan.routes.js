const express = require("express");
const router = express.Router();
const scanController = require("../controllers/scan.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// Routes
router.post("/process", authenticateToken, scanController.processScan);
router.get("/status/:ofId", authenticateToken, scanController.getScanStatus);
router.get("/history", authenticateToken, scanController.getHistory);
router.post("/verify", authenticateToken, scanController.verifyScan);

module.exports = router;
