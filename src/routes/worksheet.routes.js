const router = require("express").Router();
const worksheetController = require("../controllers/worksheet.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.use(authMiddleware);

// 1. جلب أسماء دليل الحسابات للـ Dropdown
router.get(
  "/account-guides",
  worksheetController.getAccountGuideNames
);

// 2. حفظ ترتيب العناصر المختارة (Sort & Submit من صفحة Trial Balance)
router.post(
  "/:contractId/sort",
  worksheetController.saveSort
);

// 3. جلب الحسابات غير المعيّنة (Unassigned Tab)
router.get(
  "/:contractId/unassigned",
  worksheetController.getUnassigned
);

// 3. جلب الحسابات المعيّنة (Assigned Tab)
router.get(
  "/:contractId/assigned",
  worksheetController.getAssigned
);

// 4. تعيين حسابات (Assign - Submit) - حساب واحد أو أكثر أو الكل
router.post(
  "/:contractId/assign",
  worksheetController.assignAccounts
);

// 5. إعادة تعيين حساب (Re-assign) من تبويبة Assigned
router.patch(
  "/accounts/:accountId/reassign",
  worksheetController.reassignAccount
);

// 6. إلغاء تعيين حساب (Unassign) - إرجاعه للـ Unassigned
router.patch(
  "/accounts/:accountId/unassign",
  worksheetController.unassignAccount
); 

module.exports = router;
  