const express = require("express");
const router = express.Router();
const ofController = require("../controllers/of.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// Routes
router.get("/", authenticateToken, ofController.getAllOFs);
router.get("/:id", authenticateToken, ofController.getOFById);
router.post("/", authenticateToken, ofController.createOF);
router.put("/:id", authenticateToken, ofController.updateOF);
router.delete("/:id", authenticateToken, ofController.deleteOF);

module.exports = router;
