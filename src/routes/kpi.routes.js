const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const kpiController = require("../controllers/kpi.controller");

router.get("/subscribers/stats", authMiddleware, adminMiddleware, kpiController.getSubscribersStats);
router.get("/files/stats", authMiddleware, adminMiddleware, kpiController.getFilesKPI);
router.get("/complaints/stats", authMiddleware, adminMiddleware, kpiController.getComplaintsKPI);
router.get("/profits", authMiddleware, adminMiddleware, kpiController.getYearlyProfitKPI);
router.get("/profits/yearly", authMiddleware, adminMiddleware, kpiController.getAllYearsMonthlyProfitKPI);


module.exports = router;
