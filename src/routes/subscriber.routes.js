const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const upload = require("../middleware/uploadSubscriberFiles");
const subscriberController = require("../controllers/subscriber.controller");

// ===============================
// Get Subscriber Profile (Self)
// ===============================
router.get(
  "/profile",
  authMiddleware,
  subscriberController.getProfile
);

// ===============================
// Upgrade Plan (Mock)
// ===============================
router.post(
  "/upgrade",
  authMiddleware,
  subscriberController.upgrade
);

// ===============================
// Add Subscriber
// ===============================
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    { name: "licenseCertificate", maxCount: 1 },
    { name: "articlesOfAssociationFile", maxCount: 1 },
    { name: "commercialRegisterFile", maxCount: 1 },
    { name: "taxCertificateFile", maxCount: 1 },
    { name: "commercialActivityFile", maxCount: 1 },
    { name: "factoryLogo", maxCount: 1 },
  ]),
  subscriberController.create
);

// ===============================
// View Subscribers (List + Filters)
// ===============================
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  subscriberController.getAll
);

// ===============================
// Update Subscriber (Editable Fields Only)
// ===============================
router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    { name: "taxCertificateFile", maxCount: 1 },
    { name: "commercialActivityFile", maxCount: 1 },
    { name: "factoryLogo", maxCount: 1 },
  ]),
  subscriberController.update
);

// ===============================
// Change Status (بدل Delete)
// ===============================
router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  subscriberController.changeStatus
);


// ===============================
// Export Subscribers Excel & PDF
// ===============================
router.get(
  "/export/excel",
  authMiddleware,
  adminMiddleware,
  subscriberController.exportExcel
);

router.get(
  "/export/pdf",
  authMiddleware,
  adminMiddleware,
  subscriberController.exportPDF
);



module.exports = router;
