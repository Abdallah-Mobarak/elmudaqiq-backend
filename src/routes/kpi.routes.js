const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const kpiController = require("../controllers/kpi.controller");

router.get("/subscribers/stats", authMiddleware, adminMiddleware, kpiController.getSubscribersStats);
router.get("/files/stats", authMiddleware, adminMiddleware, kpiController.getFilesKPI);
module.exports = router;
