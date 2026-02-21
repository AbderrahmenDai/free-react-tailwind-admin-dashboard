const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// Get production statistics (protected route)
router.get("/stats", authenticateToken, dashboardController.getProductionStats);

module.exports = router;
