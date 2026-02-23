const branchService = require("../services/branch.service");

exports.createBranch = async (req, res, next) => {
  try {
    const result = await branchService.create(req.user.subscriberId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getBranches = async (req, res, next) => {
  try {
    const result = await branchService.getAll(req.user.subscriberId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateBranch = async (req, res, next) => {
  try {
    const result = await branchService.update(req.user.subscriberId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
