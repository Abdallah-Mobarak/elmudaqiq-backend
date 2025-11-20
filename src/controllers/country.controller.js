const countryService = require("../services/country.service");

module.exports = {

  // -------------------------
  // CREATE COUNTRY
  // -------------------------
  create: async (req, res, next) => {
    try {
      const { 
        name, 
        cpaWebsite, 
        commerceWebsite, 
        taxWebsite 
      } = req.body;

      const result = await countryService.createCountry({
        name,
        cpaWebsite,
        commerceWebsite,
        taxWebsite
      });

      res.json(result);

    } catch (err) {
      next(err);
    }
  },


  // -------------------------
  // GET ALL
  // -------------------------
  getAll: async (req, res, next) => {
    try {
      const countries = await countryService.getAllCountries();
      res.json(countries);
    } catch (err) {
      next(err);
    }
  },


  // -------------------------
  // UPDATE
  // -------------------------
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { 
        name, 
        cpaWebsite, 
        commerceWebsite, 
        taxWebsite 
      } = req.body;

      const result = await countryService.updateCountry(id, {
        name,
        cpaWebsite,
        commerceWebsite,
        taxWebsite
      });

      res.json(result);

    } catch (err) {
      next(err);
    }
  },


  // -------------------------
  // DELETE
  // -------------------------
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await countryService.deleteCountry(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

};
