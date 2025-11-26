const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const reviewGuideController = require("../controllers/reviewGuide.controller");

// All routes protected + admin only
router.post("/", authMiddleware, adminMiddleware, reviewGuideController.create);
router.get("/", authMiddleware, adminMiddleware, reviewGuideController.getAll);
router.get("/:id", authMiddleware, adminMiddleware, reviewGuideController.getOne);
router.put("/:id", authMiddleware, adminMiddleware, reviewGuideController.update);
router.delete("/:id", authMiddleware, adminMiddleware, reviewGuideController.delete);

router.post(
  "/import",
  authMiddleware,
  adminMiddleware,
  uploadExcel.single("file"), 
  reviewGuideController.importExcel
);

router.get(
  "/export/excel",
  authMiddleware,
  adminMiddleware,
  reviewGuideController.exportExcel
);

router.get(
  "/:id/export/excel",
  authMiddleware,
  adminMiddleware,
  reviewGuideController.exportOneExcel
);

router.get(
  "/export/pdf",
  authMiddleware,
  adminMiddleware,
  reviewGuideController.exportPDF
);

router.get(
  "/:id/export/pdf",
  authMiddleware,
  adminMiddleware,
  reviewGuideController.exportOnePDF
);

module.exports = router;
