const kpiService = require("../services/kpi.service");

module.exports = {

  getSubscribersStats: async (req, res, next) => {
    try {
      const data = await kpiService.getSubscribersStats(req.query);

      res.json({
        message: "Subscribers KPI loaded successfully",
        data
      });
    } catch (err) {
      next(err);
    }
  },


  getFilesKPI: async (req, res, next) => {
  try {
    const data = await kpiService.getFilesKPI(req.query);

    res.json({
      message: "Files KPI loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
}





};
