const planService = require("../services/plan.service");

module.exports = {
  create: async (req, res) => {
    const plan = await planService.createPlan(req.body);
    res.status(201).json(plan);
  },

  getAll: async (req, res) => {
    const plans = await planService.getAllPlans();
    res.json(plans);
  },

  getById: async (req, res) => {
    const plan = await planService.getPlanById(req.params.id);
    res.json(plan);
  },

  update: async (req, res) => {
    const plan = await planService.updatePlan(req.params.id, req.body);
    res.json(plan);
  },

  remove: async (req, res) => {
    await planService.deletePlan(req.params.id);
    res.json({ message: "Plan deactivated successfully" });
  },
};
