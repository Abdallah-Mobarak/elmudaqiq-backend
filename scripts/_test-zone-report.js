/** Generate the Zone-format full report for a contract (end-to-end test). */
const { generateZoneReportHtml } = require("../src/services/fs/zoneReport");
const exportPdfFromHtml = require("../src/utils/fileHandlers/exportPdfFromHtml");

const contractId = process.argv[2] || "dae46abe-3c09-4640-9a6e-80ba7b453663";

(async () => {
  const html = await generateZoneReportHtml(contractId, { opinionType: "UNQUALIFIED" });
  const checks = ["مجمع الإهلاك آخر المدة", "الوعاء الزكوي", "الفرضيات الاكتوارية", "جدول استحقاق الإيجارات", "عدد الحصص", "صافي الدخل الشامل الآخر", "إجمالي الدخل الشامل للسنة"];
  for (const c of checks) console.log((html.includes(c) ? "✓" : "✗"), c);
  const pages = (html.match(/page-break-after:\s*always/g) || []).length;
  const { filePath } = await exportPdfFromHtml({ html, filePrefix: "ZONE_" + contractId.slice(0, 8) });
  console.log("أقسام/صفحات تقريبية:", pages + 1, "| PDF:", filePath);
  process.exit(0);
})().catch((e) => { console.error("ERR:", e.message, "\n", e.stack); process.exit(1); });
