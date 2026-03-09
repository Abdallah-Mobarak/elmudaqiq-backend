const engagementContractService = require("../services/engagementContract.service");

// ===============================
// Create Contract (Secretary)
// ===============================
exports.create = async (req, res, next) => {
  try {
    const contract = await engagementContractService.create(req.user, req.body, req.files || {});
    res.status(201).json({
      message: "Engagement Contract created successfully",
      data: contract
    });
  } catch (error) {
    next(error);
  }
};


// ===============================
// Get All Contracts
// ===============================
exports.getAll = async (req, res, next) => {
  try {
    const result = await engagementContractService.getAll(req.user, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};


// ===============================
// Get One Contract
// ===============================
exports.getOne = async (req, res, next) => {
  try {
    const contract = await engagementContractService.getOne(req.user, req.params.id);
    res.status(200).json({ data: contract });
  } catch (error) {
    next(error);
  }
};


// ===============================
// Update Contract (Secretary)
// ===============================
exports.update = async (req, res, next) => {
  try {
    const contract = await engagementContractService.update(
      req.user,
      req.params.id,
      req.body,
      req.files || {}
    );

    res.status(200).json({
      message: "Engagement Contract updated successfully",
      data: contract
    });
  } catch (error) {
    next(error);
  }
};


// ===============================
// Review Contract (Audit Manager)
// ===============================
exports.review = async (req, res, next) => {
  try {
    const contract = await engagementContractService.review(
      req.user,
      req.params.id,
      req.body
    );

    res.status(200).json({
      message: "Contract review status updated",
      data: contract
    });
  } catch (error) {
    next(error);
  }
};


// ===============================
// Assign Staff (Audit Manager)
// ===============================
exports.assignStaff = async (req, res, next) => {
  try {
    // req.body should contain { userId, role }

    const result = await engagementContractService.assignStaff(
      req.user,
      req.params.id,
      req.body
    );

    res.status(201).json({
      message: "Staff assigned successfully",
      data: result
    });

  } catch (error) {
    next(error);
  }
};

// ===============================
// Remove Staff
// ===============================
exports.removeStaff = async (req, res, next) => {
  try {
    // params: id (contractId), staffId (userId to remove)
    await engagementContractService.removeStaff(req.user, req.params.id, req.params.staffId);
    res.status(200).json({ message: "Staff removed successfully" });
  } catch (error) {
    next(error);
  }
};