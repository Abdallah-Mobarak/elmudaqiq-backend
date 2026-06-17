const financialStatements = require("../services/financialStatements.service");
const { renderPositionStatement, renderIncomeStatement } = require("../utils/fileHandlers/renderStatementHtml");
const { renderFullReport } = require("../utils/fileHandlers/renderReportSections");
const { determineOpinion } = require("../services/auditOpinion.service");
const exportPdfFromHtml = require("../utils/fileHandlers/exportPdfFromHtml");

/**
 * قائمة المركز المالي
 * GET /financial-statements/:contractId/position
 */
exports.getStatementOfFinancialPosition = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const data = await financialStatements.generateStatementOfFinancialPosition(contractId);
    res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Statement of Financial Position Error:", error);
    next(error);
  }
};

/**
 * قائمة الدخل الشامل
 * GET /financial-statements/:contractId/income
 */
exports.getStatementOfIncome = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const data = await financialStatements.generateStatementOfIncome(contractId);
    res.status(200).json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Statement of Income Error:", error);
    next(error);
  }
};

/**
 * قائمة المركز المالي — PDF
 * GET /financial-statements/:contractId/position/pdf
 */
exports.getStatementOfFinancialPositionPdf = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const data = await financialStatements.generateStatementOfFinancialPosition(contractId);
    const html = renderPositionStatement(data);
    const { buffer } = await exportPdfFromHtml({ html, filePrefix: `position_${contractId}` });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="statement_of_financial_position.pdf"`);
    res.status(200).send(buffer);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Position PDF Error:", error);
    next(error);
  }
};

/**
 * قائمة الدخل الشامل — PDF
 * GET /financial-statements/:contractId/income/pdf
 */
exports.getStatementOfIncomePdf = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const data = await financialStatements.generateStatementOfIncome(contractId);
    const html = renderIncomeStatement(data);
    const { buffer } = await exportPdfFromHtml({ html, filePrefix: `income_${contractId}` });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="statement_of_income.pdf"`);
    res.status(200).send(buffer);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Income PDF Error:", error);
    next(error);
  }
};

/**
 * التقرير الكامل (غلاف + فهرس + تقرير المراجع + القوائم + الإيضاحات) — PDF
 * GET /financial-statements/:contractId/full/pdf?opinion=UNQUALIFIED
 */
exports.getFullReportPdf = async (req, res, next) => {
  try {
    const { contractId } = req.params;

    // Opinion: explicit override (?opinion=) wins; otherwise auto-determine from
    // findings (?findings=<json array>); otherwise default to unqualified.
    // The findings will be sourced from the working papers once that module persists them.
    let opinionType = (req.query.opinion || "").toUpperCase();
    if (!opinionType && req.query.findings) {
      try {
        opinionType = determineOpinion(JSON.parse(req.query.findings)).opinion;
      } catch (_) {
        /* ignore malformed findings */
      }
    }
    opinionType = opinionType || "UNQUALIFIED";

    // Reporting framework (FRD 2.3.4): full IFRS by default; ?framework=SME for SMEs.
    const FRAMEWORKS = {
      IFRS: "المعايير الدولية للتقارير المالية المعتمدة في المملكة العربية السعودية",
      SME: "المعيار الدولي للتقارير المالية للمنشآت الصغيرة والمتوسطة المعتمد في المملكة العربية السعودية",
    };
    const framework = FRAMEWORKS[(req.query.framework || "").toUpperCase()] || undefined;

    // Optional Emphasis of Matter (FRD 2.3.10): ?eomNote=<n>&eomText=<...>
    const emphasis = req.query.eomText ? { note: req.query.eomNote, text: req.query.eomText } : null;

    const { contract, model, position, income, auditor } = await financialStatements.generateFullReport(contractId);
    const html = renderFullReport({ contract, model, position, income, opinionType, auditor, framework, emphasis });
    const { buffer } = await exportPdfFromHtml({ html, filePrefix: `full_report_${contractId}` });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="financial_statements_report.pdf"`);
    res.status(200).send(buffer);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Full Report PDF Error:", error);
    next(error);
  }
};
