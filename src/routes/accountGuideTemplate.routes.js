const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const controller = require("../controllers/accountGuideTemplate.controller");
const uploadExcel = require("../middleware/uploadExcel");

router.post("/",authMiddleware ,adminMiddleware , controller.create);
router.get("/",authMiddleware , adminMiddleware, controller.getAll);
router.put("/:id", authMiddleware, adminMiddleware, controller.update);
router.delete("/:id", authMiddleware,adminMiddleware , controller.delete);

// Import & Export
router.post("/import", authMiddleware, adminMiddleware, uploadExcel.single("file"), controller.importExcel);
router.get("/export/excel", authMiddleware, adminMiddleware, controller.exportExcel);

module.exports = router;
