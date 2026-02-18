const service = require("../services/reviewMarkIndexTemplate.service");

module.exports = {
  create: async (req, res, next) => {
    try {
      const payload = { ...req.body };
      if (req.file) payload.codeImage = req.file.path.replace(/\\/g, "/");
      res.json(await service.create(payload));
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try { res.json(await service.getAll()); } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try { res.json(await service.update(req.params.id, req.body)); } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try { res.json(await service.delete(req.params.id)); } catch (err) { next(err); }
  },

  importExcel: async (req, res, next) => {
    try {
      if (!req.file) throw { customMessage: "Excel file is required", status: 400 };
      const result = await service.importExcel(req.file);
      res.json(result);
    } catch (err) { next(err); }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await service.exportExcel();
      res.download(filePath);
    } catch (err) { next(err); }
  }
};