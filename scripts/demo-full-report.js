/**
 * Demo — the FULL financial-statements report (cover + index + auditor's report +
 * statements + notes) as ONE multi-page PDF, through the real engine.
 *
 * Run:  node scripts/demo-full-report.js
 * Output: exports/full_report_alnoor_*.pdf
 */
const svc = require("../src/services/financialStatements.service");
const { renderFullReport } = require("../src/utils/fileHandlers/renderReportSections");
const exportPdfFromHtml = require("../src/utils/fileHandlers/exportPdfFromHtml");

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
  // الإيرادات
  { id: 40, accountNumber: 4, level: "1", accountName: "الإيرادات" },
  { id: 41, accountNumber: 41, level: "2", accountName: "إيرادات النشاط" },
  { id: 42, accountNumber: 411, level: "3", accountName: "إيرادات عقود المقاولات" },
  { id: 43, accountNumber: 4111, level: "4", accountName: "إيرادات مشاريع" },
  // المصروفات
  { id: 50, accountNumber: 5, level: "1", accountName: "المصروفات" },
  { id: 51, accountNumber: 51, level: "2", accountName: "مصروفات تشغيلية" },
  { id: 52, accountNumber: 511, level: "3", accountName: "مصروفات عمومية وإدارية" },
  { id: 53, accountNumber: 5111, level: "4", accountName: "رواتب وأجور" },
  { id: 54, accountNumber: 5112, level: "4", accountName: "إيجارات" },
  { id: 55, accountNumber: 512, level: "3", accountName: "مصروفات بيعية وتسويقية" },
  { id: 56, accountNumber: 5121, level: "4", accountName: "دعاية وإعلان" },
];

const tbAccounts = [
  // موجودات (مدين = موجب)
  { id: "t1", accountCode: "1111", accountName: "الصندوق", finalBalance: 50000, assignedAccountGuideId: 4 },
  { id: "t2", accountCode: "1112", accountName: "البنك الأهلي", finalBalance: 300000, assignedAccountGuideId: 5 },
  { id: "t3", accountCode: "1113", accountName: "مصرف الراجحي", finalBalance: 150000, assignedAccountGuideId: 6 },
  { id: "t4", accountCode: "1121", accountName: "عملاء مقاولات", finalBalance: 250000, assignedAccountGuideId: 8 },
  { id: "t5", accountCode: "1131", accountName: "مخزون مواد بناء", finalBalance: 400000, assignedAccountGuideId: 10 },
  { id: "t6", accountCode: "1211", accountName: "معدات وآليات", finalBalance: 780000, assignedAccountGuideId: 13 },
  { id: "t7", accountCode: "1221", accountName: "برامج", finalBalance: 70000, assignedAccountGuideId: 15 },
  // مطلوبات (دائن = سالب)
  { id: "t8", accountCode: "2111", accountName: "موردون", finalBalance: -300000, assignedAccountGuideId: 23 },
  { id: "t9", accountCode: "2121", accountName: "رواتب مستحقة", finalBalance: -100000, assignedAccountGuideId: 25 },
  { id: "t10", accountCode: "2211", accountName: "مخصص مكافأة نهاية الخدمة", finalBalance: -150000, assignedAccountGuideId: 28 },
  // حقوق ملكية (دائن = سالب)
  { id: "t11", accountCode: "3111", accountName: "رأس المال", finalBalance: -1000000, assignedAccountGuideId: 33 },
  { id: "t12", accountCode: "3121", accountName: "الأرباح المبقاة", finalBalance: -450000, assignedAccountGuideId: 35 },
  // إيرادات (دائن = سالب)
  { id: "t13", accountCode: "4111", accountName: "إيرادات مشاريع", finalBalance: -3000000, assignedAccountGuideId: 43 },
  // مصروفات (مدين = موجب)
  { id: "t14", accountCode: "5111", accountName: "رواتب وأجور", finalBalance: 1200000, assignedAccountGuideId: 53 },
  { id: "t15", accountCode: "5112", accountName: "إيجارات", finalBalance: 300000, assignedAccountGuideId: 54 },
  { id: "t16", accountCode: "5121", accountName: "دعاية وإعلان", finalBalance: 180000, assignedAccountGuideId: 56 },
];

const contract = {
  customerName: "مؤسسة النور للمقاولات العامة",
  legalEntity: "مؤسسة فردية",
  nationality: "سعودية",
  city: "الرياض",
  fiscalYearEnd: "2025-12-31",
  commercialRegisterNumber: "1010xxxxxx",
  taxNumber: "3001xxxxxxxxx03",
  unifiedNumber: "7001xxxxxx",
  address: "الرياض - حي الياسمين",
  email: "info@alnoor.example",
};

// Scale a period's balances by a factor (keeps the trial balance in equilibrium).
const scaleTb = (factor) =>
  tbAccounts.map((a) => ({ ...a, finalBalance: Math.round(a.finalBalance * factor) }));

(async () => {
  // Default: TWO comparative periods (current + prior). The opening date is an
  // exception added only on transition / restatement (financial effect — FRD Extended mode).
  const mCurrent = svc.buildModel({ contract, trialBalanceStatus: "CONFIRMED", tbAccounts: scaleTb(1), guides });
  const mPrior = svc.buildModel({ contract, tbAccounts: scaleTb(0.8), guides });

  const periods = ["31 ديسمبر 2025", "31 ديسمبر 2024"];
  const models = [mCurrent, mPrior];

  const noteSeq = { next: 6 };
  const position = svc.buildPositionStatement(models, noteSeq, periods);
  const income = svc.buildIncomeStatement(models, noteSeq, periods);

  console.log("الأعمدة:", position.periods.join(" | "));
  console.log("الموجودات (الفترات):", position.totals.totalAssets.map((n) => n.toLocaleString()).join(" | "), "| متوازنة؟", position.totals.balanced);
  console.log("صافي الدخل (الفترات):", income.totals.netResult.map((n) => n.toLocaleString()).join(" | "));

  const html = renderFullReport({
    contract,
    model: mCurrent,
    position,
    income,
    opinionType: "UNQUALIFIED",
    framework: "المعيار الدولي للتقرير المالي للمنشآت الصغيرة والمتوسطة المعتمد في المملكة العربية السعودية",
    auditor: { name: "محمد سعيد بن حسن", office: "المكتب الرئيسي", preamble: "محاسبون ومراجعون قانونيون", license: "594", city: "الرياض", hijriDate: "1447/07/21هـ", gregorianDate: "2026/01/10م" },
  });
  const { filePath } = await exportPdfFromHtml({ html, filePrefix: "full_report_alnoor" });
  console.log("PDF:", filePath);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
