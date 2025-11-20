const systemSettingsService = require("../services/systemSettings.service");

module.exports = {
  getSettings: async (req, res) => {
    try {
      const data = await systemSettingsService.getSettings();
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const data = await systemSettingsService.updateSettings(req.body);
      res.json({
        message: "System settings updated successfully",
        data
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
};
