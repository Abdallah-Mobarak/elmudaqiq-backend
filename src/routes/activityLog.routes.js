const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const activityLogController = require("../controllers/activityLog.controller");

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  activityLogController.getAll
);

module.exports = router;
