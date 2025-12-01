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

  // Mark notification as read
  markAsRead: async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await notificationService.markAsRead(id);
      res.json({
        message: "Notification marked as read",
        data,
      });
    } catch (err) {
      next(err);
    }
  }

};
