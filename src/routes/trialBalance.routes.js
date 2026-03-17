const router = require("express").Router();
const trialBalanceController = require("../controllers/trialBalance.controller");
const uploadExcel = require("../middleware/uploadExcel");
const authMiddleware = require("../middleware/auth.middleware");

// حماية المسارات (Authentication)
router.use(authMiddleware);

// 1. رفع ميزان المراجعة (Excel)
router.post(
  "/:contractId/trial-balance/upload",
  uploadExcel.single("file"),
  trialBalanceController.uploadTrialBalance
);

// 2. جلب ميزان المراجعة (Grid View)
router.get(
  "/:contractId/trial-balance",
  trialBalanceController.getTrialBalance
); 

// 3. تعديل التسويات (Adjustments)
router.patch(
  "/trial-balance/accounts/:accountId",
  trialBalanceController.updateAccountAdjustments
);

// 4. اعتماد وقفل ميزان المراجعة (Confirm & Lock)
router.post(
  "/:contractId/trial-balance/confirm",
  trialBalanceController.confirmTrialBalance
);

// 5. تصدير ميزان المراجعة Excel
router.get(
  "/:contractId/trial-balance/export/excel",
  trialBalanceController.exportTrialBalanceExcel
);

// 6. تصدير ميزان المراجعة PDF
router.get(
  "/:contractId/trial-balance/export/pdf",
  trialBalanceController.exportTrialBalancePdf
);

module.exports = router;