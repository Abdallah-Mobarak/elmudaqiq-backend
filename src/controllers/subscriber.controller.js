const subscriberService = require("../services/subscriber.service");

//  Add
exports.create = async (req, res, next) => {
  try {
    const data = await subscriberService.create(req.body, req.files);
    res.status(201).json({ message: "Subscriber created", data });
  } catch (err) {
    next(err);
  }
};

//  View All + Filters
exports.getAll = async (req, res, next) => {
  try {
    const result = await subscriberService.getAll(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

//  Update
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await subscriberService.update(id, req.body, req.files);
    res.json({ message: "Subscriber updated", data });
  } catch (err) {
    next(err);
  }
};

//  Change Status
exports.changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const data = await subscriberService.changeStatus(id, status);

    res.json({ message: "Status updated", data });
  } catch (err) {
    next(err);
  }
};


//  Export Excel
exports.exportExcel = async (req, res, next) => {
  try {
    const { filePath } = await subscriberService.exportExcel(req.query);
    return res.download(filePath);
  } catch (err) {
    next(err);
  }
};

//  Export PDF
exports.exportPDF = async (req, res, next) => {
  try {
    const { filePath, stream } = await subscriberService.exportPDF(req.query);
    stream.on("finish", () => res.download(filePath));
  } catch (err) {
    next(err);
  }
};
