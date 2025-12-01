const activityLogService = require("../services/activityLog.service");

module.exports = {

  getAll: async (req, res, next) => {
    try {
      const data = await activityLogService.getAll();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

};
