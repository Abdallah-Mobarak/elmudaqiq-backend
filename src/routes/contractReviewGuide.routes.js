const router = require("express").Router();
const controller = require("../controllers/contractReviewGuide.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requirePermission = require("../middleware/requirePermission");
const upload = require("../middleware/uploadContractFiles");
const PERMISSIONS = require("../config/permissions");

// All routes require authentication
router.use(authMiddleware);

// Update a specific review guide item (isApplicable, conclusion)
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EDIT_REVIEW_GUIDE),
  controller.updateGuideItem
);

// Upload a supporting document for a specific review guide item
router.post(
  "/:id/documents",
  requirePermission(PERMISSIONS.EDIT_REVIEW_GUIDE),
  upload.single('document'),
  controller.addDocument
);

module.exports = router;