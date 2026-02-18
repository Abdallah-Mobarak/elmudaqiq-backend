const service = require("../services/reviewGuide.service");

module.exports = {

  create: async (req, res, next) => {
    try {
      const result = await service.create(req.body, req.user.subscriberId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const result = await service.getAll(req.query, req.user.subscriberId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getOne: async (req, res, next) => {
    try {
      const result = await service.getOne(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const result = await service.update(req.params.id, req.body, req.user.subscriberId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const result = await service.delete(req.params.id, req.user.subscriberId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  importExcel: async (req, res, next) => {
    try {
      const result = await service.importExcel(req.file, req.user.subscriberId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await service.exportExcel(req.query, req.user.subscriberId);
      res.download(filePath);
    } catch (err) {
      next(err);
    }
  },

  exportPDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await service.exportPDF(req.query, req.user.subscriberId);
      stream.on("finish", () => res.download(filePath));
    } catch (err) {
      next(err);
    }
  }

};
