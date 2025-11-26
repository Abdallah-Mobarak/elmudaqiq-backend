const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");

const reviewObjectivesController = require("../controllers/reviewObjective.controller");

// ----------------------------
// CRUD
// ----------------------------
router.post("/", authMiddleware, adminMiddleware, reviewObjectivesController.create);
router.get("/", authMiddleware, adminMiddleware, reviewObjectivesController.getAll);
router.get("/:id", authMiddleware, adminMiddleware, reviewObjectivesController.getOne);
router.put("/:id", authMiddleware, adminMiddleware, reviewObjectivesController.update);
router.delete("/:id", authMiddleware, adminMiddleware, reviewObjectivesController.delete);

// ----------------------------
// IMPORT
// ----------------------------
router.post(
  "/import",
  authMiddleware,
  adminMiddleware,
  uploadExcel.single("file"),
  reviewObjectivesController.importExcel
);

// ----------------------------
// EXPORT EXCEL
// ----------------------------
router.get("/export/excel", authMiddleware, adminMiddleware, reviewObjectivesController.exportExcel);
router.get("/:id/export/excel", authMiddleware, adminMiddleware, reviewObjectivesController.exportOneExcel);

// ----------------------------
// EXPORT PDF
// ----------------------------
router.get("/export/pdf", authMiddleware, adminMiddleware, reviewObjectivesController.exportPDF);
router.get("/:id/export/pdf", authMiddleware, adminMiddleware, reviewObjectivesController.exportOnePDF);

module.exports = router;
