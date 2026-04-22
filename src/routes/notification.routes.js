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

// Get MY notifications (Logged in user) — supports ?page=&limit=&isRead=true|false
router.get(
  "/mine",
  authMiddleware,
  notificationController.getMyNotifications
);

// Get MY unread count (for badge)
router.get(
  "/mine/unread-count",
  authMiddleware,
  notificationController.getUnreadCount
);

// Mark all MY notifications as read
router.patch(
  "/mine/mark-all-read",
  authMiddleware,
  notificationController.markAllAsRead
);

// Mark a single notification as read (owner OR admin)
router.patch(
  "/:id/read",
  authMiddleware,
  notificationController.markAsRead
);

module.exports = router;
