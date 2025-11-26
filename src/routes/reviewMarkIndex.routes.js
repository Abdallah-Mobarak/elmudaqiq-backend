const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const uploadImage = require("../middleware/uploadImage");

const reviewMarkIndexController = require("../controllers/reviewMarkIndex.controller");

// CRUD
router.post("/", authMiddleware, adminMiddleware, uploadImage.single("codeImage"), reviewMarkIndexController.create);
router.get("/", authMiddleware, adminMiddleware, reviewMarkIndexController.getAll);
router.get("/:id", authMiddleware, adminMiddleware, reviewMarkIndexController.getOne);
router.put("/:id", authMiddleware, adminMiddleware, uploadImage.single("codeImage"), reviewMarkIndexController.update);
router.delete("/:id", authMiddleware, adminMiddleware, reviewMarkIndexController.delete);

// IMPORT EXCEL
router.post("/import", authMiddleware, adminMiddleware, uploadExcel.single("file"), reviewMarkIndexController.importExcel);

// EXPORT EXCEL
router.get("/export/excel", authMiddleware, adminMiddleware, reviewMarkIndexController.exportExcel);
router.get("/:id/export/excel", authMiddleware, adminMiddleware, reviewMarkIndexController.exportExcel);

// EXPORT PDF
// router.get("/export/pdf", authMiddleware, adminMiddleware, reviewMarkIndexController.exportPDF);
// router.get("/:id/export/pdf", authMiddleware, adminMiddleware, reviewMarkIndexController.exportOnePDF);

module.exports = router;
