const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const accountGuideController = require("../controllers/accountGuide.controller");

// CRUD
router.post("/", authMiddleware, accountGuideController.create);
router.get("/", authMiddleware, accountGuideController.getAll);
router.put("/:id", authMiddleware, accountGuideController.update);
router.delete("/:id", authMiddleware, accountGuideController.delete);

// Import & Export
router.post("/import", authMiddleware, uploadExcel.single("file"), accountGuideController.importExcel);
router.get("/export/excel", authMiddleware, accountGuideController.exportExcel);
router.get("/export/pdf", authMiddleware, accountGuideController.exportPDF);

module.exports = router;
