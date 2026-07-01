const router = require("express").Router();
const trialBalanceController = require("../controllers/trialBalance.controller");
const comparativeController = require("../controllers/comparativePeriod.controller");
const uploadExcel = require("../middleware/uploadExcel");
const authMiddleware = require("../middleware/auth.middleware");

// حماية المسارات (Authentication)
router.use(authMiddleware);

// ===============================
// الفترة المقارنة (السنة السابقة)
// ===============================
// سياق المقارنة: السنة الحالية + الموجود + إمكانية الاستدعاء من عقد سابق
router.get("/:contractId/comparative/context", comparativeController.getContext);
// إنشاء فترة مقارنة يدوية لسنة محددة (body: { year })
router.post("/:contractId/comparative", comparativeController.createManual);
// استدعاء فترة المقارنة من عقد سنة سابقة لنفس الشركة
router.post("/:contractId/comparative/link", comparativeController.linkFromPrior);
// جلب جدول سنة مقارنة محددة
router.get("/:contractId/comparative/:year", comparativeController.getGrid);
// حفظ القيم المُدخلة يدوياً لسنة مقارنة (body: { accounts: [...] })
router.put("/:contractId/comparative/:year", comparativeController.saveManual);
// اعتماد وقفل سنة مقارنة
router.post("/:contractId/comparative/:year/confirm", comparativeController.confirm);

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