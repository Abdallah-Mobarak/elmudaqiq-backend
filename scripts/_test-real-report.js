/**
 * Generate the full report for a REAL contract from the local DB (end-to-end test).
 * Usage: node scripts/_test-real-report.js <contractId>
 */
const svc = require("../src/services/financialStatements.service");
const { renderFullReport } = require("../src/utils/fileHandlers/renderReportSections");
const exportPdfFromHtml = require("../src/utils/fileHandlers/exportPdfFromHtml");

const contractId = process.argv[2] || "dae46abe-3c09-4640-9a6e-80ba7b453663";

(async () => {
  const { contract, model, position, income, auditor } = await svc.generateFullReport(contractId);
  console.log("الشركة:", contract.customerName, "| الكيان:", contract.legalEntity);
  console.log("المراجع:", auditor.name || "(غير محدد)", "| ترخيص:", auditor.license || "-", "| هـ:", auditor.hijriDate);
  console.log("حسابات مربوطة:", model.mappedCount);
  console.log("الموجودات:", JSON.stringify(position.totals.totalAssets), "| متوازنة؟", position.totals.balanced, "| الفرق:", JSON.stringify(position.totals.difference));
  console.log("الأقسام (مركز مالي):");
  for (const s of position.sections) {
    console.log("  -", s.title, "=", JSON.stringify(s.totals), "(", (s.groups || []).length, "مجموعة )");
  }
  console.log("الدخل: إيرادات", JSON.stringify(income.totals.totalRevenue), "| صافي", JSON.stringify(income.totals.netResult));

  const html = renderFullReport({ contract, model, position, income, auditor, opinionType: "UNQUALIFIED" });
  const { filePath } = await exportPdfFromHtml({ html, filePrefix: "REAL_report_" + contractId.slice(0, 8) });
  console.log("PDF:", filePath);
  process.exit(0);
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
