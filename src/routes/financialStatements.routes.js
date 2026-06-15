const router = require("express").Router();
const controller = require("../controllers/financialStatements.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.use(authMiddleware);

// 1. قائمة المركز المالي (JSON)
router.get("/:contractId/position", controller.getStatementOfFinancialPosition);

// 2. قائمة الدخل الشامل (JSON)
router.get("/:contractId/income", controller.getStatementOfIncome);

// 3. قائمة المركز المالي (PDF)
router.get("/:contractId/position/pdf", controller.getStatementOfFinancialPositionPdf);

// 4. قائمة الدخل الشامل (PDF)
router.get("/:contractId/income/pdf", controller.getStatementOfIncomePdf);

// 5. التقرير الكامل (غلاف + فهرس + تقرير + قوائم + إيضاحات) — PDF
router.get("/:contractId/full/pdf", controller.getFullReportPdf);

module.exports = router;
