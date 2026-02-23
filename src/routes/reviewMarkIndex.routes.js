const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const uploadImage = require("../middleware/uploadImage");

const controller = require("../controllers/reviewMarkIndex.controller");

// CRUD
router.post("/", auth, uploadImage.single("codeImage"), controller.create);
router.get("/", auth, controller.getAll);
router.get("/:id", auth, controller.getOne);
router.put("/:id", auth, uploadImage.single("codeImage"), controller.update);
router.delete("/:id", auth, controller.delete);

// Import & Export
router.post("/import", auth, uploadExcel.single("file"), controller.importExcel);
router.get("/export/excel", auth, controller.exportExcel);
router.get("/export/pdf", auth, controller.exportPDF);

module.exports = router;
