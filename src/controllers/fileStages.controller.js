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
      const { page, limit, search, stageCode, stage, entityType } = req.query;
      const result = await fileStagesService.getAll({ page, limit, search, stageCode, stage, entityType });
      res.json(result);
    } catch (err) { next(err); }
  },

  getOne: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await fileStagesService.getOne(id);
      res.json(item);
    } catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await fileStagesService.update(id, req.body);
      res.json(data);
    } catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await fileStagesService.delete(id);
      res.json(result);
    } catch (err) { next(err); }
  },

  importExcel: async (req, res, next) => {
    try {
      if (!req.file) throw { customMessage: "Excel file is required", status: 400 };
      const result = await fileStagesService.importExcel(req.file);
      res.json(result);
    } catch (err) { next(err); }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await fileStagesService.exportExcel(req.query, null);
      res.download(filePath);
    } catch (err) { next(err); }
  },

  exportOneExcel: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { filePath } = await fileStagesService.exportExcel(req.query, id);
      res.download(filePath);
    } catch (err) { next(err); }
  },

  exportPDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await fileStagesService.exportPDF(req.query);
      stream.on("finish", () => res.download(filePath));
      stream.on("error", (err) => next(err));
    } catch (err) { next(err); }
  },

  exportOnePDF: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { filePath, stream } = await fileStagesService.exportPDF({ id });
      stream.on("finish", () => res.download(filePath));
      stream.on("error", (err) => next(err));
    } catch (err) { next(err); }
  }
};
