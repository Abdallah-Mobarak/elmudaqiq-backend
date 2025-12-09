const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const accountGuideController = require("../controllers/accountGuide.controller");

// CRUD
router.post("/", authMiddleware, adminMiddleware, accountGuideController.create);
router.get("/", authMiddleware, adminMiddleware, accountGuideController.getAll);
router.put("/:id", authMiddleware, adminMiddleware, accountGuideController.update);
router.delete("/:id", authMiddleware, adminMiddleware, accountGuideController.delete);

// Import & Export
router.post("/import", authMiddleware, adminMiddleware, uploadExcel.single("file"), accountGuideController.importExcel);
router.get("/export/excel", authMiddleware, adminMiddleware, accountGuideController.exportExcel);
router.get("/export/pdf", authMiddleware, adminMiddleware, accountGuideController.exportPDF);

module.exports = router;
