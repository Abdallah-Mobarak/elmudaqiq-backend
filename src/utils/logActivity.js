const activityLogService = require("../services/activityLog.service");

module.exports = async ({
  userId = null,
  subscriberId = null,
  userType,
  action,
  message,
  req
}) => {
  try {
    await activityLogService.create({
      userId,
      subscriberId,
      userType,
      action,
      message,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("Activity log failed:", error.message);
  }
};

// -------------    -----------
// await logActivity({
//   subscriberId: id,
//   action: "UPDATE_SUBSCRIBER",
//   message: "Subscriber updated",
//   req,
// });

