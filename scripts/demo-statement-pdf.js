/**
 * Demo: render a Zone-like Statement of Financial Position to a real PDF,
 * WITHOUT touching the database. Run:  node scripts/demo-statement-pdf.js
 * Output: exports/demo_position_*.pdf
 */
const { renderPositionStatement } = require("../src/utils/fileHandlers/renderStatementHtml");
const exportPdfFromHtml = require("../src/utils/fileHandlers/exportPdfFromHtml");

const statement = {
  type: "STATEMENT_OF_FINANCIAL_POSITION",
  title: "قائمة المركز المالي",
  contract: {
    customerName: "شركة زون الطبية",
    legalEntity: "شركة ذات مسؤولية محدودة",
    nationality: "سعودية",
    fiscalYearEnd: "2024-12-31",
  },
  sections: [
    {
      key: "ASSET",
      title: "الموجودات",
      total: 43269593,
      groups: [
        {
          title: "الموجودات المتداولة",
          subtotal: 16660646,
          lines: [
            { name: "النقد وما في حكمه", note: 6, amount: 11909529 },
            { name: "ذمم وأرصدة مدينة تجارية", note: 7, amount: 102023 },
            { name: "المخزون السلعي (البضاعة)", note: 8, amount: 3622642 },
            { name: "مصروفات مدفوعة مقدماً", note: 9, amount: 534926 },
            { name: "ذمم مدينة أخرى", note: 10, amount: 491526 },
          ],
        },
        {
          title: "الموجودات غير المتداولة",
          subtotal: 26608947,
          lines: [
            { name: "أصول غير ملموسة", note: 11, amount: 105399 },
            { name: "الممتلكات والآلات والمعدات", note: 12, amount: 11816048 },
            { name: "أصول حق الاستخدام", note: 13, amount: 14687500 },
          ],
        },
      ],
    },
    {
      key: "LIABILITY",
      title: "المطلوبات",
      total: 28191528,
      groups: [
        {
          title: "المطلوبات المتداولة",
          subtotal: 13557858,
          lines: [
            { name: "ذمم وأرصدة دائنة تجارية", note: 14, amount: 2591600 },
            { name: "ذمم وأرصدة دائنة أخرى", note: 15, amount: 923841 },
            { name: "مستحق لأطراف ذات علاقة", note: 16, amount: 4160700 },
            { name: "التزامات عقود إيجار متداولة", note: 17, amount: 1362427 },
            { name: "مصروفات مستحقة", note: 18, amount: 3173314 },
            { name: "أوراق دفع", note: 19, amount: 914551 },
            { name: "مخصص الزكاة", note: 20, amount: 431425 },
          ],
        },
        {
          title: "المطلوبات غير المتداولة",
          subtotal: 14633670,
          lines: [
            { name: "التزامات منافع الموظفين المحددة", note: 21, amount: 390503 },
            { name: "التزامات عقود إيجار غير متداولة", note: 22, amount: 14243167 },
          ],
        },
      ],
    },
    {
      key: "EQUITY",
      title: "حقوق الملكية",
      total: 15078066,
      groups: [
        {
          title: "حقوق الملكية",
          subtotal: 15078066,
          lines: [
            { name: "رأس المال", note: 23, amount: 1000000 },
            { name: "الاحتياطي النظامي", note: 24, amount: 300000 },
            { name: "خسائر إعادة قياس التزامات منافع الموظفين", note: 25, amount: -179223 },
            { name: "الأرباح (الخسائر) المبقاة", note: null, amount: 13957289 },
          ],
        },
      ],
    },
  ],
  totals: {
    totalAssets: 43269593,
    totalLiabilities: 28191528,
    totalEquity: 15078066,
    liabilitiesPlusEquity: 43269594,
    balanced: false,
    difference: -1,
  },
};

(async () => {
  const html = renderPositionStatement(statement);
  const { filePath } = await exportPdfFromHtml({ html, filePrefix: "demo_position" });
  console.log("PDF generated:", filePath);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
