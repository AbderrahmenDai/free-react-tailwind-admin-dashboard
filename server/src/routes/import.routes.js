const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const importController = require("../controllers/import.controller");
const { authenticateToken, authorize } = require("../middleware/auth.middleware");

router.get("/template", authenticateToken, importController.generateTemplate);
router.post("/hu/preview", authenticateToken, upload.single("file"), importController.previewImport);
router.post("/hu/confirm", authenticateToken, importController.confirmImport);

module.exports = router;
