const service = require("../services/accountGuideTemplate.service");

module.exports = {
  create: async (req, res, next) => {
    try {
      const result = await service.create(req.body);
      res.json({ message: "Template created successfully", data: result });
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const result = await service.getAll();
      res.json(result);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const result = await service.update(req.params.id, req.body);
      res.json({ message: "Template updated", data: result });
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      await service.delete(req.params.id);
      res.json({ message: "Template deleted" });
    } catch (err) { next(err); }
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
