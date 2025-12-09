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

// Import & Export
router.post("/import", auth, admin, uploadExcel.single("file"), controller.importExcel);
router.get("/export/excel", auth, admin, controller.exportExcel);
router.get("/export/pdf", auth, admin, controller.exportPDF);

module.exports = router;
