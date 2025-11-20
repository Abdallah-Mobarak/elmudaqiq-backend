const express = require("express");
const router = express.Router();

const systemSettingsController = require("../controllers/systemSettings.controller");

// GET all settings
router.get("/", systemSettingsController.getSettings);

// UPDATE settings
router.put("/", systemSettingsController.updateSettings);

module.exports = router;
 