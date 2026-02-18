const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const controller = require("../controllers/reviewGuideTemplate.controller");
const uploadExcel = require("../middleware/uploadExcel");

router.post("/", auth, admin, controller.create);
router.get("/", auth, admin, controller.getAll);
router.put("/:id", auth, admin, controller.update);
router.delete("/:id", auth, admin, controller.delete);

// Import & Export
router.post("/import", auth, admin, uploadExcel.single("file"), controller.importExcel);
router.get("/export/excel", auth, admin, controller.exportExcel);

module.exports = router;