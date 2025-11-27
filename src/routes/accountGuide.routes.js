const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const accountGuideController = require("../controllers/accountGuide.controller");

// All routes protected + admin only
router.post("/", authMiddleware, adminMiddleware, accountGuideController.create);
router.get("/", authMiddleware, adminMiddleware, accountGuideController.getAll);
router.get("/:id", authMiddleware, adminMiddleware, accountGuideController.getOne);
router.put("/:id", authMiddleware, adminMiddleware, accountGuideController.update);
router.delete("/:id", authMiddleware, adminMiddleware, accountGuideController.delete);
router.post("/import", authMiddleware, adminMiddleware, uploadExcel.single("file"), accountGuideController.importExcel);
router.get("/export/pdf", authMiddleware, adminMiddleware, accountGuideController.exportPDF);
router.get("/:id/export/pdf", authMiddleware, adminMiddleware, accountGuideController.exportOnePDF);
router.get("/:id/export/excel", authMiddleware, adminMiddleware, accountGuideController.exportExcel);
router.get("/all/export/excel", authMiddleware, adminMiddleware, accountGuideController.exportExcel);

 
module.exports = router; 
