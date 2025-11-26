const reviewGuideService = require("../services/reviewGuide.service");

module.exports = {

  // ---------------- CREATE ---------------- //
  create: async (req, res, next) => {
    try {
      const data = await reviewGuideService.create(req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- GET ALL ---------------- //
  getAll: async (req, res, next) => {
    try {
      const {
        page,
        limit,
        search,
        level,
        number,
        statement,
        responsiblePerson
      } = req.query;

      const data = await reviewGuideService.getAll({
        page,
        limit,
        search,
        level,
        number,
        statement,
        responsiblePerson
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- GET ONE ---------------- //
  getOne: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await reviewGuideService.getOne(id);
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- UPDATE ---------------- //
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await reviewGuideService.update(id, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- DELETE ---------------- //
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await reviewGuideService.delete(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- IMPORT EXCEL ---------------- //
  importExcel: async (req, res, next) => {
    try {
      if (!req.file) {
        throw { customMessage: "Excel file is required", status: 400 };
      }

      const result = await reviewGuideService.importExcel(req.file);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- EXPORT EXCEL (ALL) ---------------- //
  exportExcel: async (req, res, next) => {
    try {
      const { filePath } = await reviewGuideService.exportExcel(req.query, null);
      res.download(filePath);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- EXPORT EXCEL (ONE) ---------------- //
  exportOneExcel: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { filePath } = await reviewGuideService.exportExcel(req.query, id);
      res.download(filePath);
    } catch (err) {
      next(err);
    }
  },

  // ---------------- EXPORT PDF (ALL) ---------------- //
  exportPDF: async (req, res, next) => {
    try {
      const { filePath, stream } = await reviewGuideService.exportPDF(req.query);

      stream.on("finish", () => res.download(filePath));
      stream.on("error", (err) => next(err));

    } catch (err) {
      next(err);
    }
  },

  // ---------------- EXPORT PDF (ONE) ---------------- //
  exportOnePDF: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { filePath, stream } = await reviewGuideService.exportPDF({ id });

      stream.on("finish", () => res.download(filePath));
      stream.on("error", (err) => next(err));

    } catch (err) {
      next(err);
    }
  }

};
