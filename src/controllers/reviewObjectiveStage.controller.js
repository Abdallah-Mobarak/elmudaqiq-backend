const service = require("../services/reviewObjectiveStage.service");

module.exports = {
  create: async (req, res, next) => {
    try {
      const data = await service.create(req.body);
      res.json(data);
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const data = await service.getAll(req.query);
      res.json(data);
    } catch (err) { next(err); }
  },

  getOne: async (req, res, next) => {
    try {
      const data = await service.getOne(req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const data = await service.update(req.params.id, req.body);
      res.json(data);
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const data = await service.delete(req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  importExcel: async (req, res, next) => {
    try {
      const data = await service.importExcel(req.file);
      res.json(data);
    } catch (err) { next(err); }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await service.exportExcel(req.query);
      res.download(filePath);
    } catch (err) { next(err); }
  },

  exportOneExcel: async (req, res, next) => {
    try {
      const { filePath } = await service.exportExcel({}, req.params.id);
      res.download(filePath);
    } catch (err) { next(err); }
  },

  exportPDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await service.exportPDF(req.query);
      stream.on("finish", () => res.download(filePath));
    } catch (err) { next(err); }
  },

  exportOnePDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await service.exportPDF({ id: req.params.id });
      stream.on("finish", () => res.download(filePath));
    } catch (err) { next(err); }
  }
};
