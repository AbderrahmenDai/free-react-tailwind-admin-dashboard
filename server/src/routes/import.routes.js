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


router.get("/references/template", authenticateToken, importController.generateReferenceTemplate);
router.post("/references/preview", authenticateToken, upload.single("file"), importController.previewReferenceImport);
router.post("/references/confirm", authenticateToken, importController.confirmReferenceImport);

router.get("/of/template", authenticateToken, importController.generateOfTemplate);
router.post("/of/preview", authenticateToken, upload.single("file"), importController.previewOfImport);
router.post("/of/confirm", authenticateToken, importController.confirmOfImport);

module.exports = router;
