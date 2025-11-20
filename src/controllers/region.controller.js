const regionService = require("../services/region.service");

module.exports = {

  create: async (req, res,next) => {
    try {
      const { name, cityId } = req.body;
      const result = await regionService.createRegion(name, cityId);
      res.json(result);
    } catch (err) {
     next(err)
    }
  },

  getAll: async (req, res,next) => {
    try {
      const regions = await regionService.getAllRegions();
      res.json(regions);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res,next) => {
    try {
      const { id } = req.params;
      const { name, cityId } = req.body;
      const result = await regionService.updateRegion(id, name, cityId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res,next) => {
    try {
      const { id } = req.params;
      const result = await regionService.deleteRegion(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

};
