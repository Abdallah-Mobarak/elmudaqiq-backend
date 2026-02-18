const service = require("../services/accountGuide.service");
const path = require("path");

module.exports = {

  create: async (req, res, next) => {
    try {
      // Pass subscriberId from the logged-in user
      const result = await service.create(req.body, req.user.subscriberId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
 
  getAll: async (req, res, next) => {
    try {
      // Pass subscriberId to filter data
      const result = await service.getAll(req.query, req.user.subscriberId);
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
      const absolutePath = path.resolve(filePath);
      return res.download(absolutePath);
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
