const fileStagesService = require("../services/fileStages.service");

module.exports = {

  create: async (req, res, next) => {
    try {
      const data = await fileStagesService.create(req.body);
      res.json(data);
    } catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try {
      const result = await fileStagesService.getAll(req.query);
      res.json(result);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const data = await fileStagesService.update(req.params.id, req.body);
      res.json(data);
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const result = await fileStagesService.delete(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  },

  importExcel: async (req, res, next) => {
    try {
      if (!req.file) {
        throw { customMessage: "Excel file is required", status: 400 };
      }
      const result = await fileStagesService.importExcel(req.file);
      res.json(result);
    } catch (err) { next(err); }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await fileStagesService.exportExcel(req.query);
      res.download(filePath);
    } catch (err) { next(err); }
  },

  exportPDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await fileStagesService.exportPDF(req.query);
      stream.on("finish", () => res.download(filePath));
      stream.on("error", (err) => next(err));
    } catch (err) { next(err); }
  }

};
