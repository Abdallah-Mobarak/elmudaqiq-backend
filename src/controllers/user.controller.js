// d:\Test\ERP\el mudaqiq\src\controllers\user.controller.js

const userService = require("../services/user.service");

module.exports = {
  create: async (req, res, next) => {
    try {
      // Pass req.user for privilege escalation check
      const result = await userService.create(req.user.subscriberId, req.body, req.file, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  getAll: async (req, res, next) => {
    try {
      // Pass req.user for Scoping
      const result = await userService.getAll(req.user.subscriberId, req.query, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getOne: async (req, res, next) => {
    try {
      const result = await userService.getOne(req.user.subscriberId, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      // Pass req.user for privilege escalation check
      const result = await userService.update(req.user.subscriberId, req.params.id, req.body, req.file, req.user);
      res.json(result);
    } catch (err) { 
      next(err);
    }
  }
};
