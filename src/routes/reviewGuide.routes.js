const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const controller = require("../controllers/reviewGuide.controller");

router.post("/", authMiddleware, controller.create);
router.get("/", authMiddleware,  controller.getAll);
router.get("/:id", authMiddleware, controller.getOne);
router.put("/:id", authMiddleware,  controller.update);
router.delete("/:id", authMiddleware, controller.delete);

router.post("/import", authMiddleware, uploadExcel.single("file"), controller.importExcel);

router.get("/export/excel", authMiddleware,  controller.exportExcel);
router.get("/export/pdf", authMiddleware,  controller.exportPDF);

module.exports = router;
