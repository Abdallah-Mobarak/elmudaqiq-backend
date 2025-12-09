const service = require("../services/reviewObjectiveStage.service");

module.exports = {

  create: async (req, res, next) => {
    try { res.json(await service.create(req.body)); }
    catch (err) { next(err); }
  },

  getAll: async (req, res, next) => {
    try { res.json(await service.getAll(req.query)); }
    catch (err) { next(err); }
  },

  getOne: async (req, res, next) => {
    try { res.json(await service.getOne(req.params.id)); }
    catch (err) { next(err); }
  },

  update: async (req, res, next) => {
    try { res.json(await service.update(req.params.id, req.body)); }
    catch (err) { next(err); }
  },

  delete: async (req, res, next) => {
    try { res.json(await service.delete(req.params.id)); }
    catch (err) { next(err); }
  },

  importExcel: async (req, res, next) => {
    try { res.json(await service.importExcel(req.file)); }
    catch (err) { next(err); }
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
