const notificationService = require("../services/notification.service");

module.exports = {

  // Create manual notification
  create: async (req, res, next) => {
    try {
      const data = await notificationService.create(req.body);
      res.status(201).json({
        message: "Notification sent successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all admin notifications
  getAll: async (req, res, next) => {
    try {
      const data = await notificationService.getAll();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  // Get logged-in user notifications (with pagination + filter by isRead)
  getMyNotifications: async (req, res, next) => {
    try {
      const result = await notificationService.getUserNotifications(req.user.id, req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // Get unread count for logged-in user (for badge)
  getUnreadCount: async (req, res, next) => {
    try {
      const data = await notificationService.getUnreadCount(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // Mark notification as read
  markAsRead: async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await notificationService.markAsRead(id, req.user.id);
      res.json({
        message: "Notification marked as read",
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // Mark all my notifications as read
  markAllAsRead: async (req, res, next) => {
    try {
      const data = await notificationService.markAllAsRead(req.user.id);
      res.json({
        message: "All notifications marked as read",
        ...data,
      });
    } catch (err) {
      next(err);
    }
  }

};
