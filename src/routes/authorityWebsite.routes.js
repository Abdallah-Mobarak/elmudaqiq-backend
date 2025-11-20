const express = require("express");
const router = express.Router();

const controller = require("../controllers/authorityWebsite.controller");

// Create
router.post("/", controller.create);

// Get All
router.get("/", controller.getAll);

// Update
router.put("/:id", controller.update);

// Delete
router.delete("/:id", controller.delete);

module.exports = router;
