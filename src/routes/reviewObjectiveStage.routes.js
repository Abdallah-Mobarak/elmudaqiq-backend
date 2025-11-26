const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");

const controller = require("../controllers/reviewObjectiveStage.controller");

// CRUD
router.post("/", auth, admin, controller.create);
router.get("/", auth, admin, controller.getAll);
router.get("/:id", auth, admin, controller.getOne);
router.put("/:id", auth, admin, controller.update);
router.delete("/:id", auth, admin, controller.delete);

// Import Excel
router.post("/import", auth, admin, uploadExcel.single("file"), controller.importExcel);

// Export Excel
router.get("/export/excel", auth, admin, controller.exportExcel);
router.get("/:id/export/excel", auth, admin, controller.exportOneExcel);

// Export PDF
router.get("/export/pdf", auth, admin, controller.exportPDF);
router.get("/:id/export/pdf", auth, admin, controller.exportOnePDF);

module.exports = router;
