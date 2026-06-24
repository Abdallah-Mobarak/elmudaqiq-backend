const financialStatements = require("../services/financialStatements.service");
const { renderPositionStatement, renderIncomeStatement } = require("../utils/fileHandlers/renderStatementHtml");
const { renderFullReport } = require("../utils/fileHandlers/renderReportSections");
const { determineOpinion } = require("../services/auditOpinion.service");
const auditFindings = require("../services/auditFindings.service");
const notify = require("../services/financialStatementsNotifications.service");
const { generateZoneReportHtml } = require("../services/fs/zoneReport");
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

    // Opinion sourcing order (FRD 2.3.9):
    //   1) explicit ?opinion= override (for previews/testing)
    //   2) the stored working-paper decision / findings (confirmed or proposed)
    //   3) ad-hoc ?findings=<json array>
    //   4) default UNQUALIFIED
    let opinionType = (req.query.opinion || "").toUpperCase();
    if (!opinionType) {
      opinionType = await auditFindings.resolveOpinionType(contractId);
    }
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

    // The full report is now served in the Zone-parity format (statements in Zone
    // order, full note catalog, movement tables, transition presentation when the
    // engagement is a first-time adoption). The old generic renderer is kept for
    // reference but no longer wired to this endpoint.
    const { contract } = await financialStatements.generateFullReport(contractId); // contract for notifications
    const html = await generateZoneReportHtml(contractId, { opinionType, framework: req.query.framework, emphasis });
    const { buffer } = await exportPdfFromHtml({ html, filePrefix: `full_report_${contractId}` });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="financial_statements_report.pdf"`);
    res.status(200).send(buffer);

    // Fire-and-forget notifications (FRD 2.3.14): statements generated + report issued.
    notify.onStatementsGenerated(contract, req.user).catch(() => {});
    notify.onReportIssued(contract, req.user).catch(() => {});
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Full Report PDF Error:", error);
    next(error);
  }
};

/**
 * التقرير الكامل بتنسيق «زون» (قالب ثابت + أرقام النظام) — PDF
 * GET /financial-statements/:contractId/full/zone/pdf
 */
exports.getZoneReportPdf = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    let opinionType = (req.query.opinion || "").toUpperCase();
    if (!opinionType) opinionType = await auditFindings.resolveOpinionType(contractId);
    opinionType = opinionType || "UNQUALIFIED";

    const emphasis = req.query.eomText ? { note: req.query.eomNote, text: req.query.eomText } : null;
    const html = await generateZoneReportHtml(contractId, { opinionType, framework: req.query.framework, emphasis });
    const { buffer } = await exportPdfFromHtml({ html, filePrefix: `zone_report_${contractId}` });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="financial_statements_zone.pdf"`);
    res.status(200).send(buffer);

    const contract = await require("../config/prisma").engagementContract
      .findUnique({ where: { id: contractId }, select: { id: true, subscriberId: true, customerName: true } })
      .catch(() => null);
    if (contract) {
      notify.onStatementsGenerated(contract, req.user).catch(() => {});
      notify.onReportIssued(contract, req.user).catch(() => {});
    }
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Zone Report PDF Error:", error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Working-paper audit findings + opinion (FRD 2.3.3 / 2.3.9)
// ---------------------------------------------------------------------------
exports.listFindings = async (req, res, next) => {
  try {
    res.status(200).json(await auditFindings.listFindings(req.params.contractId));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

exports.createFinding = async (req, res, next) => {
  try {
    const finding = await auditFindings.createFinding(req.params.contractId, req.body, req.user && req.user.id);
    // Opinion-determined notification (FRD 2.3.14).
    notify.onOpinionDetermined(req.params.contractId, req.user).catch(() => {});
    res.status(201).json(finding);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

exports.deleteFinding = async (req, res, next) => {
  try {
    res.status(200).json(await auditFindings.deleteFinding(req.params.contractId, req.params.id));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

exports.getOpinion = async (req, res, next) => {
  try {
    res.status(200).json(await auditFindings.getOpinion(req.params.contractId));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

exports.confirmOpinion = async (req, res, next) => {
  try {
    const decision = await auditFindings.confirmOpinion(req.params.contractId, req.body, req.user && req.user.id);
    res.status(200).json(decision);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};
