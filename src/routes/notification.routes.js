const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const notificationController = require("../controllers/notification.controller");

// Create manual notification (Admin)
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  notificationController.create
);

// Get all admin notifications
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  notificationController.getAll
);

// Mark notification as read
router.patch(
  "/:id/read",
  authMiddleware,
  adminMiddleware,
  notificationController.markAsRead
);

module.exports = router;
