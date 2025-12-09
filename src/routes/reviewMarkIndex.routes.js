const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const uploadImage = require("../middleware/uploadImage");

const controller = require("../controllers/reviewMarkIndex.controller");

// CRUD
router.post("/", auth, admin, uploadImage.single("codeImage"), controller.create);
router.get("/", auth, admin, controller.getAll);
router.get("/:id", auth, admin, controller.getOne);
router.put("/:id", auth, admin, uploadImage.single("codeImage"), controller.update);
router.delete("/:id", auth, admin, controller.delete);

// Import & Export
router.post("/import", auth, admin, uploadExcel.single("file"), controller.importExcel);
router.get("/export/excel", auth, admin, controller.exportExcel);
router.get("/export/pdf", auth, admin, controller.exportPDF);

module.exports = router;
