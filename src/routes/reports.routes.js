const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const reportsController = require("../controllers/reports.controller");

router.get(
  "/renewal-status",
  authMiddleware,
  adminMiddleware,
  reportsController.getRenewalReport
);

module.exports = router;
