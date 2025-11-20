const cityService = require("../services/city.service");

module.exports = {

  create: async (req, res,next) => {
    try {
      const { name, countryId } = req.body;
      const result = await cityService.createCity(name, countryId);
      res.json(result);
    } catch (err) {
     next(err);
    }
  },

  getAll: async (req, res,next) => {
    try {
      const cities = await cityService.getAllCities();
      res.json(cities);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res,next) => {
    try {
      const { id } = req.params;
      const { name, countryId } = req.body;
      const result = await cityService.updateCity(id, name, countryId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res,next) => {
    try {
      const { id } = req.params;
      const result = await cityService.deleteCity(id);
      res.json(result);
    } catch (err) {
     next(err);
    }
  }
};
