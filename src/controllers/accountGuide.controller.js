const accountGuideService = require("../services/accountGuide.service");

module.exports = {

  create: async (req, res, next) => {
    try {
      const data = await accountGuideService.create(req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

    getAll: async (req, res, next) => {
    try {
      const {
        page,
        limit,
        search,
        level,
        accountNumber,
        accountName,
        code,
        sortBy,
        sortOrder
      } = req.query;

      const result = await accountGuideService.getAll({
        page,
        limit,
        search,
        level,
        accountNumber,
        accountName,
        code,
        sortBy,
        sortOrder
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getOne: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await accountGuideService.getOne(id);
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const data = await accountGuideService.update(id, req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await accountGuideService.delete(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

};
