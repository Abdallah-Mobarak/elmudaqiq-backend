const router = require("express").Router();
const controller = require("../controllers/engagementContract.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requirePermission = require("../middleware/requirePermission");
const reviewGuideController = require("../controllers/contractReviewGuide.controller");
const upload = require("../middleware/uploadContractFiles");
const PERMISSIONS = require("../config/permissions");

// Configure File Uploads
const contractUploads = upload.fields([
  { name: 'articlesOfAssociation', maxCount: 1 },
  { name: 'vatCertificate', maxCount: 1 },
  { name: 'unifiedNumberCertificate', maxCount: 1 },
  { name: 'commercialRegisterActivity', maxCount: 1 },
  { name: 'facilityLogo', maxCount: 1 }
]);

// Apply authentication middleware
router.use(authMiddleware);

// Create Contract (Secretary)
router.post(
  "/",
  requirePermission(PERMISSIONS.CREATE_CONTRACT),
  contractUploads,
  controller.create
);

// Get Contracts
router.get(
  "/",
  requirePermission(PERMISSIONS.VIEW_CONTRACTS),
  controller.getAll
);

// Get One Contract
router.get(
  "/:id", 
  requirePermission(PERMISSIONS.VIEW_CONTRACTS),
  controller.getOne
);

// Update Contract (Secretary)
router.put(
  "/:id",
  requirePermission(PERMISSIONS.UPDATE_CONTRACT),
  contractUploads,
  controller.update
);

// Review Contract (Audit Manager)
router.patch(
  "/:id/review",
  requirePermission(PERMISSIONS.REVIEW_CONTRACT),
  controller.review
);

// Get Eligible Staff for Assignment
router.get(
  "/:id/eligible-staff",
  requirePermission(PERMISSIONS.MANAGE_CONTRACT_STAFF),
  controller.getEligibleStaff
);

// Assign Staff (Audit Manager & Technical Auditor)
router.post(
  "/:id/assign-staff",
  // We need a permission that covers both, or check inside controller/service
  // Let's assume MANAGE_CONTRACT_STAFF is added to Audit Manager too, or we use multiple permissions
  requirePermission(PERMISSIONS.MANAGE_CONTRACT_STAFF), 
  controller.assignStaff
);

// Remove Staff
router.delete(
  "/:id/staff/:staffId",
  requirePermission(PERMISSIONS.MANAGE_CONTRACT_STAFF),
  controller.removeStaff
);

// ===============================
// Technical Auditor Routes
// ===============================
// Note: They use existing GET / (getAll) but filtered by Service logic
// Staff Management uses existing /:id/assign-staff but we need to ensure permissions allow Tech Auditor

// Get all review guides for a specific contract
router.get(
  "/:id/review-guides",
  requirePermission(PERMISSIONS.VIEW_CONTRACTS),
  reviewGuideController.getContractGuides
);

// Get PENDING review guides (isApplicable = null)
router.get(
  "/:id/pending-guides",
  requirePermission(PERMISSIONS.VIEW_CONTRACTS),
  reviewGuideController.getPendingGuides
);

module.exports = router;