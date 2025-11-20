const authorityWebsiteService = require("../services/authorityWebsite.service");

module.exports = {
  create: async (req, res, next) => {
    try {
      const data = await authorityWebsiteService.createWebsite(req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  getAll: async (req, res, next) => {
    try {
      const data = await authorityWebsiteService.getAllWebsites();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const data = await authorityWebsiteService.updateWebsite(req.params.id, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const data = await authorityWebsiteService.deleteWebsite(req.params.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
};
