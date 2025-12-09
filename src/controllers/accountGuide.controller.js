const service = require("../services/accountGuide.service");
const path = require("path");

module.exports = {

  create: async (req, res, next) => {
    try {
      const result = await service.create(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
 
  getAll: async (req, res, next) => {
    try {
      const result = await service.getAll(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const result = await service.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const result = await service.delete(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  importExcel: async (req, res, next) => {
    try {
      const result = await service.importExcel(req.file);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await service.exportExcel(req.query);
      const absolutePath = path.resolve(filePath);
      return res.download(absolutePath);
    } catch (err) {
      next(err);
    }
  },

  exportPDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await service.exportPDF(req.query);
      stream.on("finish", () => res.download(filePath));
    } catch (err) {
      next(err);
    }
  }

};
