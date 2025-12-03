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
  },


getComplaintsKPI: async (req, res, next) => {
  try {
    const data = await kpiService.getComplaintsKPI(req.query);

    res.json({
      message: "Complaints KPI loaded successfully",
      data
    });

  } catch (err) {
    next(err);
  }
  },

getYearlyProfitKPI: async (req, res, next) => {
  try {
    const { year } = req.query;

    const data = await kpiService.getYearlyProfitKPI({ year });

    res.json({
      message: "Yearly profit KPI loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
  },


getAllYearsMonthlyProfitKPI: async (req, res, next) => {
  try {
    const data = await kpiService.getAllYearsMonthlyProfitKPI();

    res.json({
      message: "All years monthly profit KPI loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
}














};
