/**
 * Demo #2 — a DIFFERENT company, generated through the REAL engine
 * (buildModel -> buildPositionStatement), exactly like the live endpoint does,
 * only the DB fetch is replaced with in-memory data.
 *
 * Proves the system is data-driven (not tailored to Zone): feed any chart of
 * accounts + mapped trial-balance and it produces the statement.
 *
 * Run:  node scripts/demo-statement-pdf2.js
 */
const fs = require("../src/services/financialStatements.service");
const { renderPositionStatement } = require("../src/utils/fileHandlers/renderStatementHtml");
const exportPdfFromHtml = require("../src/utils/fileHandlers/exportPdfFromHtml");

// --- Account Guide (4-level chart) — accountNumber prefix defines the hierarchy ---
const guides = [
  // الموجودات
  { id: 1, accountNumber: 1, level: "1", accountName: "الموجودات" },
  { id: 2, accountNumber: 11, level: "2", accountName: "الموجودات المتداولة" },
  { id: 3, accountNumber: 111, level: "3", accountName: "النقد وما في حكمه" },
  { id: 4, accountNumber: 1111, level: "4", accountName: "الصندوق" },
  { id: 5, accountNumber: 1112, level: "4", accountName: "البنك الأهلي" },
  { id: 6, accountNumber: 1113, level: "4", accountName: "مصرف الراجحي" },
  { id: 7, accountNumber: 112, level: "3", accountName: "ذمم مدينة تجارية" },
  { id: 8, accountNumber: 1121, level: "4", accountName: "عملاء مقاولات" },
  { id: 9, accountNumber: 113, level: "3", accountName: "المخزون" },
  { id: 10, accountNumber: 1131, level: "4", accountName: "مخزون مواد بناء" },
  { id: 11, accountNumber: 12, level: "2", accountName: "الموجودات غير المتداولة" },
  { id: 12, accountNumber: 121, level: "3", accountName: "ممتلكات وآلات ومعدات" },
  { id: 13, accountNumber: 1211, level: "4", accountName: "معدات وآليات" },
  { id: 14, accountNumber: 122, level: "3", accountName: "أصول غير ملموسة" },
  { id: 15, accountNumber: 1221, level: "4", accountName: "برامج" },
  // المطلوبات
  { id: 20, accountNumber: 2, level: "1", accountName: "المطلوبات" },
  { id: 21, accountNumber: 21, level: "2", accountName: "المطلوبات المتداولة" },
  { id: 22, accountNumber: 211, level: "3", accountName: "ذمم وأرصدة دائنة تجارية" },
  { id: 23, accountNumber: 2111, level: "4", accountName: "موردون" },
  { id: 24, accountNumber: 212, level: "3", accountName: "مصروفات مستحقة" },
  { id: 25, accountNumber: 2121, level: "4", accountName: "رواتب مستحقة" },
  { id: 26, accountNumber: 22, level: "2", accountName: "المطلوبات غير المتداولة" },
  { id: 27, accountNumber: 221, level: "3", accountName: "التزامات منافع الموظفين" },
  { id: 28, accountNumber: 2211, level: "4", accountName: "مخصص مكافأة نهاية الخدمة" },
  // حقوق الملكية
  { id: 30, accountNumber: 3, level: "1", accountName: "حقوق الملكية" },
  { id: 31, accountNumber: 31, level: "2", accountName: "رأس المال والأرباح" },
  { id: 32, accountNumber: 311, level: "3", accountName: "رأس المال" },
  { id: 33, accountNumber: 3111, level: "4", accountName: "رأس المال" },
  { id: 34, accountNumber: 312, level: "3", accountName: "الأرباح المبقاة" },
  { id: 35, accountNumber: 3121, level: "4", accountName: "الأرباح المبقاة" },
];

// --- Trial balance accounts, each mapped to a Level-4 guide. ---
// Sign convention: debit balances positive, credit balances negative.
const tbAccounts = [
  { id: "t1", accountCode: "1111", accountName: "الصندوق", finalBalance: 50000, assignedAccountGuideId: 4 },
  { id: "t2", accountCode: "1112", accountName: "البنك الأهلي", finalBalance: 300000, assignedAccountGuideId: 5 },
  { id: "t3", accountCode: "1113", accountName: "مصرف الراجحي", finalBalance: 150000, assignedAccountGuideId: 6 },
  { id: "t4", accountCode: "1121", accountName: "عملاء مقاولات", finalBalance: 250000, assignedAccountGuideId: 8 },
  { id: "t5", accountCode: "1131", accountName: "مخزون مواد بناء", finalBalance: 400000, assignedAccountGuideId: 10 },
  { id: "t6", accountCode: "1211", accountName: "معدات وآليات", finalBalance: 780000, assignedAccountGuideId: 13 },
  { id: "t7", accountCode: "1221", accountName: "برامج", finalBalance: 70000, assignedAccountGuideId: 15 },
  // مطلوبات (دائنة = سالب)
  { id: "t8", accountCode: "2111", accountName: "موردون", finalBalance: -300000, assignedAccountGuideId: 23 },
  { id: "t9", accountCode: "2121", accountName: "رواتب مستحقة", finalBalance: -100000, assignedAccountGuideId: 25 },
  { id: "t10", accountCode: "2211", accountName: "مخصص مكافأة نهاية الخدمة", finalBalance: -150000, assignedAccountGuideId: 28 },
  // حقوق ملكية (دائنة = سالب)
  { id: "t11", accountCode: "3111", accountName: "رأس المال", finalBalance: -1000000, assignedAccountGuideId: 33 },
  { id: "t12", accountCode: "3121", accountName: "الأرباح المبقاة", finalBalance: -450000, assignedAccountGuideId: 35 },
];

const contract = {
  customerName: "مؤسسة النور للمقاولات العامة",
  legalEntity: "مؤسسة فردية",
  nationality: "سعودية",
  fiscalYearEnd: "2025-12-31",
};

(async () => {
  // Same path the live endpoint uses, minus the DB fetch.
  const model = fs.buildModel({ contract, trialBalanceStatus: "CONFIRMED", tbAccounts, guides });
  const statement = fs.buildPositionStatement(model);

  console.log("الشركة:", statement.contract.customerName);
  console.log("إجمالي الموجودات:", statement.totals.totalAssets.toLocaleString());
  console.log("المطلوبات + حقوق الملكية:", statement.totals.liabilitiesPlusEquity.toLocaleString());
  console.log("متوازنة؟", statement.totals.balanced, "| الفرق:", statement.totals.difference);

  const html = renderPositionStatement(statement);
  const { filePath } = await exportPdfFromHtml({ html, filePrefix: "demo_alnoor_position" });
  console.log("PDF:", filePath);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
