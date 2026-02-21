const express = require("express");
const router = express.Router();
const referenceController = require("../controllers/reference.controller");
const { authenticateToken, authorize } = require("../middleware/auth.middleware");

// Routes
router.get("/", authenticateToken, referenceController.getAllReferences);
router.get("/:id", authenticateToken, referenceController.getReferenceById);
router.post("/", authenticateToken, authorize("ADMIN", "SUPERVISOR"), referenceController.createReference);
router.put("/:id", authenticateToken, authorize("ADMIN", "SUPERVISOR"), referenceController.updateReference);
router.delete("/:id", authenticateToken, authorize("ADMIN"), referenceController.deleteReference);

module.exports = router;
