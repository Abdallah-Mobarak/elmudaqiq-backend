const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const fileStagesController = require("../controllers/fileStageTemplate.controller");

router.post("/", authMiddleware, adminMiddleware, fileStagesController.create);
router.get("/", authMiddleware, adminMiddleware, fileStagesController.getAll);
router.put("/:id", authMiddleware, adminMiddleware, fileStagesController.update);
router.delete("/:id", authMiddleware, adminMiddleware, fileStagesController.delete);

// Import & Export
router.post("/import", authMiddleware, adminMiddleware, uploadExcel.single("file"), fileStagesController.importExcel);
router.get("/export/excel", authMiddleware, adminMiddleware, fileStagesController.exportExcel);

module.exports = router;