const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const uploadExcel = require("../middleware/uploadExcel");
const controller = require("../controllers/reviewGuide.controller");

router.post("/", authMiddleware, adminMiddleware, controller.create);
router.get("/", authMiddleware, adminMiddleware, controller.getAll);
router.get("/:id", authMiddleware, adminMiddleware, controller.getOne);
router.put("/:id", authMiddleware, adminMiddleware, controller.update);
router.delete("/:id", authMiddleware, adminMiddleware, controller.delete);

router.post("/import", authMiddleware, adminMiddleware, uploadExcel.single("file"), controller.importExcel);

router.get("/export/excel", authMiddleware, adminMiddleware, controller.exportExcel);
router.get("/export/pdf", authMiddleware, adminMiddleware, controller.exportPDF);

module.exports = router;
