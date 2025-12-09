const service = require("../services/reviewMarkIndex.service");

module.exports = {
  create: async (req, res, next) => {
    try {
      const payload = { ...req.body };
      if (req.file) payload.codeImage = req.file.path.replace(/\\/g, "/");
      const result = await service.create(payload);
      res.json(result);
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const result = await service.getAll(req.query);
      res.json(result);
    } catch (err) { next(err); }
  },

  getOne: async (req, res, next) => {
    try {
      const result = await service.getOne(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const payload = { ...req.body };
      if (req.file) payload.codeImage = req.file.path.replace(/\\/g, "/");
      const result = await service.update(req.params.id, payload);
      res.json(result);
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const result = await service.delete(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  },

  importExcel: async (req, res, next) => {
    try {
      const result = await service.importExcel(req.file);
      res.json(result);
    } catch (err) { next(err); }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await service.exportExcel(req.query);
      res.download(filePath);
    } catch (err) { next(err); }
  },

  exportPDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await service.exportPDF(req.query);
      stream.on("finish", () => res.download(filePath));
    } catch (err) { next(err); }
  }
};
