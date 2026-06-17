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

// 5ب. التقرير الكامل بتنسيق «زون» (قالب ثابت + كل الإيضاحات وجداول الحركة) — PDF
router.get("/:contractId/full/zone/pdf", controller.getZoneReportPdf);

// 6. ملاحظات أوراق العمل (Findings) — تغذّي محرك الرأي (2.3.3 / 2.3.9)
router.get("/:contractId/findings", controller.listFindings);
router.post("/:contractId/findings", controller.createFinding);
router.delete("/:contractId/findings/:id", controller.deleteFinding);

// 7. الرأي: المقترح + التأكيد/التجاوز (2.3.9 / BR-7)
router.get("/:contractId/opinion", controller.getOpinion);
router.post("/:contractId/opinion/confirm", controller.confirmOpinion);

module.exports = router;
