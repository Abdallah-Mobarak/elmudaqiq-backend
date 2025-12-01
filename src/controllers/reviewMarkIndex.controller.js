const reviewMarkIndexService = require("../services/reviewMarkIndex.service");

// ✅ CREATE
exports.create = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (req.file) {
      payload.codeImage = req.file.path.replace(/\\/g, "/");
    }

    const result = await reviewMarkIndexService.create(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✅ GET ALL
exports.getAll = async (req, res, next) => {
  try {
    const result = await reviewMarkIndexService.getAll(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✅ GET ONE
exports.getOne = async (req, res, next) => {
  try {
    const result = await reviewMarkIndexService.getOne(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✅ UPDATE
exports.update = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (req.file) {
      payload.codeImage = req.file.path.replace(/\\/g, "/");
    }

    const result = await reviewMarkIndexService.update(req.params.id, payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✅ DELETE
exports.delete = async (req, res, next) => {
  try {
    const result = await reviewMarkIndexService.delete(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✅ IMPORT EXCEL
exports.importExcel = async (req, res, next) => {
  try {
    const result = await reviewMarkIndexService.importExcel(req.file);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✅ EXPORT EXCEL
exports.exportExcel = async (req, res, next) => {
  try {
    const { filePath } = await reviewMarkIndexService.exportExcel(req.query);
    res.download(filePath);
  } catch (err) {
    next(err);
  }
};
 