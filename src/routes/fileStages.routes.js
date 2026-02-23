const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const fileStagesController = require("../controllers/fileStages.controller");

// CRUD
router.post("/", authMiddleware, fileStagesController.create);
router.get("/", authMiddleware, fileStagesController.getAll);
router.put("/:id", authMiddleware, fileStagesController.update);
router.delete("/:id", authMiddleware, fileStagesController.delete);

// Import & Export 
router.post(
  "/import",
  authMiddleware,
  
  uploadExcel.single("file"),
  fileStagesController.importExcel
);

router.get(
  "/export/excel",
  authMiddleware,
  fileStagesController.exportExcel
);

router.get(
  "/export/pdf",
  authMiddleware,
  fileStagesController.exportPDF
);

module.exports = router;
