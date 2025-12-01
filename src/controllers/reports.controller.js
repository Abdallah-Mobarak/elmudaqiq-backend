const reportsService = require("../services/reports.service");

exports.getRenewalReport = async (req, res, next) => {
  try {
    const data = await reportsService.getRenewalReport();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
