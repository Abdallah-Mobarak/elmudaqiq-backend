const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const fileStagesController = require("../controllers/fileStages.controller");

// Protected + admin only
router.post("/", authMiddleware, adminMiddleware, fileStagesController.create);
router.get("/", authMiddleware, adminMiddleware, fileStagesController.getAll);
router.get("/:id", authMiddleware, adminMiddleware, fileStagesController.getOne);
router.put("/:id", authMiddleware, adminMiddleware, fileStagesController.update);
router.delete("/:id", authMiddleware, adminMiddleware, fileStagesController.delete);

router.post("/import", authMiddleware, adminMiddleware, uploadExcel.single("file"), fileStagesController.importExcel);
router.get("/export/excel", authMiddleware, adminMiddleware, fileStagesController.exportExcel);
router.get("/:id/export/excel", authMiddleware, adminMiddleware, fileStagesController.exportOneExcel);
router.get("/export/pdf", authMiddleware, adminMiddleware, fileStagesController.exportPDF);
router.get("/:id/export/pdf", authMiddleware, adminMiddleware, fileStagesController.exportOnePDF);

module.exports = router;
