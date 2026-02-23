const express = require("express");
const router = express.Router();
const branchController = require("../controllers/branch.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requirePermission = require("../middleware/requirePermission");
const PERMISSIONS = require("../config/permissions");

// All routes require authentication
router.use(authMiddleware);

router.post(
  "/",
  requirePermission(PERMISSIONS.CREATE_BRANCH),
  branchController.createBranch
);

router.get(
  "/",
  requirePermission(PERMISSIONS.VIEW_BRANCHES),
  branchController.getBranches
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.UPDATE_BRANCH),
  branchController.updateBranch
);

module.exports = router;
