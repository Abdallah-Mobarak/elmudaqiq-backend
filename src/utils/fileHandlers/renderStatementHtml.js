/**
 * Renders financial statements as Arabic RTL HTML, ready to be turned into a
 * polished PDF by a headless browser (see exportPdfFromHtml.js).
 *
 * Each statement is produced as a *body fragment* (`positionBody`, `incomeBody`, ...)
 * so fragments can be combined into one multi-page document (htmlDoc) — cover,
 * index, auditor's report, the four statements and the notes — matching the Zone
 * reference package.
 */

/** Format a money value, accounting style: 1,234 · (1,234) for negatives · "-" for zero. */
function money(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) < 0.005) return "-";
  const s = Math.abs(Math.round(v)).toLocaleString("en-US");
  return v < 0 ? `(${s})` : s;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Build the entity sub-title line, e.g. "(شركة ذات مسؤولية محدودة – سعودية)". */
function entityLine(contract) {
  const parts = [contract?.legalEntity, contract?.nationality].filter(Boolean).map(esc);
  return parts.length ? `(${parts.join(" – ")})` : "";
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function fiscalDateLabel(contract) {
  const d = contract?.fiscalYearEnd ? new Date(contract.fiscalYearEnd) : null;
  if (!d || isNaN(d)) return "";
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()} م`;
}

function dmyLabel(d) {
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()} م`;
}

/**
 * Fiscal-period text (FRD 2.3.7 / BR-5): a full 12-month period reads
 * "للسنة المالية المنتهية في …"; any other length reads "للفترة المالية من … إلى …".
 */
function fiscalPeriodText(contract) {
  const end = contract?.fiscalYearEnd ? new Date(contract.fiscalYearEnd) : null;
  const start = contract?.fiscalYearStart ? new Date(contract.fiscalYearStart) : null;
  if (end && start && !isNaN(end) && !isNaN(start)) {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const isFullYear = months === 11 || months === 12; // e.g. 1 Jan → 31 Dec = 11
    if (!isFullYear) return `للفترة المالية من ${dmyLabel(start)} إلى ${dmyLabel(end)}`;
  }
  return `للسنة المالية المنتهية في ${fiscalDateLabel(contract)}`;
}

/** Shared HTML head: Arabic font + formal statement CSS (multi-page aware). */
function htmlHead() {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Cairo', 'Amiri', 'Traditional Arabic', 'Arial', sans-serif;
    direction: rtl; color: #111; font-size: 12px; margin: 0; padding: 0; line-height: 1.6;
  }
  .sheet { padding: 6px 14px; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }

  .statement-header { text-align: center; margin-bottom: 14px; }
  .statement-header .company { font-size: 16px; font-weight: 700; }
  .statement-header .entity  { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .statement-header .title   { font-size: 15px; font-weight: 700; margin-top: 10px; }
  .statement-header .date    { font-size: 12px; margin-top: 2px; }

  table.fs { width: 100%; border-collapse: collapse; }
  table.fs th, table.fs td { padding: 4px 6px; vertical-align: middle; }
  table.fs thead th { border-bottom: 1.5px solid #111; font-weight: 700; font-size: 12px; text-align: center; }
  table.fs thead th.caption { text-align: right; }
  .col-note { width: 8%; text-align: center; }
  .col-amount { width: 20%; text-align: center; font-variant-numeric: tabular-nums; }
  .col-caption { text-align: right; }
  td.amount { text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.note { text-align: center; color: #444; }
  tr.section-head td { font-weight: 700; font-size: 13px; padding-top: 12px; }
  tr.group-head td { font-weight: 700; padding-top: 6px; }
  tr.line td.col-caption { padding-right: 16px; }
  tr.subtotal td { border-top: 1px solid #111; font-weight: 600; }
  tr.section-total td { border-top: 1px solid #111; font-weight: 700; }
  tr.grand-total td { border-top: 2px solid #111; border-bottom: 2px double #111; font-weight: 700; padding: 6px; }
  tr.spacer td { height: 6px; }
  .footnote { margin-top: 16px; text-align: center; font-size: 11px; color: #444; }
  .balance-ok { color: #137333; }
  .balance-fail { color: #c5221f; font-weight: 700; }

  /* Cover */
  .cover { text-align: center; padding-top: 220px; }
  .cover .c1 { font-size: 22px; font-weight: 700; }
  .cover .c2 { font-size: 16px; font-weight: 600; margin-top: 6px; }
  .cover .c3 { font-size: 14px; margin-top: 6px; }
  .cover .c4 { font-size: 16px; font-weight: 700; margin-top: 40px; }
  .cover .c5 { font-size: 14px; margin-top: 8px; }

  /* Index / report / notes */
  .doc-title { text-align: center; font-weight: 700; font-size: 15px; margin: 6px 0 14px; }
  .report-head { text-align: center; margin-bottom: 12px; }
  .report-head .company { font-weight: 700; font-size: 15px; }
  .sec-title { font-weight: 700; font-size: 13px; margin: 14px 0 4px; text-decoration: underline; }
  .para { text-align: justify; margin: 6px 0; }
  table.index { width: 100%; border-collapse: collapse; margin-top: 10px; }
  table.index td { padding: 6px 4px; border-bottom: 1px dashed #bbb; }
  table.index td.pg { text-align: left; width: 18%; font-variant-numeric: tabular-nums; }
  .sign { margin-top: 36px; line-height: 2; }
  .note-block { margin: 10px 0 16px; }
  .note-title { font-weight: 700; }
  table.mini { width: 70%; border-collapse: collapse; margin: 6px 0; }
  table.mini td { padding: 3px 6px; border-bottom: 1px solid #eee; }
  table.mini td.amount { text-align: center; font-variant-numeric: tabular-nums; }
  table.mini tr.tot td { border-top: 1px solid #111; font-weight: 700; }
</style>
</head>`;
}

/** Wrap one or more body fragments into a complete printable HTML document. */
function htmlDoc(...bodies) {
  return `${htmlHead()}\n<body>\n${bodies.join("\n")}\n</body>\n</html>`;
}

// ---------------------------------------------------------------------------
// Statement body fragments
// ---------------------------------------------------------------------------

/** Build period column headers + helpers for an N-period statement. */
function periodSetup(statement) {
  const periods = statement.periods && statement.periods.length ? statement.periods : ["السنة الحالية"];
  const np = periods.length;
  const colspan = np + 2; // caption + note + N amounts
  const amountHeads = periods.map((p) => `<th class="col-amount">${esc(p)}</th>`).join("");
  const cells = (arr) => {
    const a = Array.isArray(arr) ? arr : [arr];
    return periods.map((_, i) => `<td class="amount">${money(a[i])}</td>`).join("");
  };
  const negCells = (arr) => {
    const a = Array.isArray(arr) ? arr : [arr];
    return periods.map((_, i) => `<td class="amount">${money(-Math.abs(a[i] || 0))}</td>`).join("");
  };
  const blankCells = () => periods.map(() => `<td></td>`).join("");
  return { periods, np, colspan, amountHeads, cells, negCells, blankCells };
}

function positionBody(statement) {
  const c = statement.contract || {};
  const rows = [];
  const sectionByKey = Object.fromEntries((statement.sections || []).map((s) => [s.key, s]));
  const P = periodSetup(statement);

  const renderSection = (sec, { totalLabel } = {}) => {
    if (!sec) return;
    const groups = sec.groups || [];
    const single = groups.length === 1;
    rows.push(`<tr class="section-head"><td class="col-caption" colspan="${P.colspan}">${esc(sec.title)}</td></tr>`);
    for (const g of groups) {
      rows.push(`<tr class="group-head"><td class="col-caption" colspan="${P.colspan}">${esc(g.title)}</td></tr>`);
      for (const line of g.lines || []) {
        rows.push(`<tr class="line"><td class="col-caption">${esc(line.name)}</td><td class="note">${line.note ?? ""}</td>${P.cells(line.amounts)}</tr>`);
      }
      if (!single) {
        rows.push(`<tr class="subtotal"><td class="col-caption">مجموع ${esc(g.title)}</td><td></td>${P.cells(g.subtotals)}</tr>`);
      }
    }
    rows.push(`<tr class="section-total"><td class="col-caption">${esc(totalLabel || "إجمالي " + sec.title)}</td><td></td>${P.cells(sec.totals)}</tr>`);
  };

  renderSection(sectionByKey.ASSET, { totalLabel: "إجمالي الموجودات" });
  rows.push(`<tr class="spacer"><td colspan="${P.colspan}"></td></tr>`);
  renderSection(sectionByKey.LIABILITY, { totalLabel: "مجموع المطلوبات" });
  renderSection(sectionByKey.EQUITY, { totalLabel: "مجموع حقوق الملكية" });

  const t = statement.totals || {};
  rows.push(`<tr class="grand-total"><td class="col-caption">إجمالي المطلوبات وحقوق الملكية</td><td></td>${P.cells(t.liabilitiesPlusEquity)}</tr>`);

  const diff0 = Array.isArray(t.difference) ? t.difference[0] : t.difference;
  const balanceNote = t.balanced
    ? `<span class="balance-ok">✔ القائمة متوازنة (الموجودات = المطلوبات + حقوق الملكية)</span>`
    : `<span class="balance-fail">⚠ القائمة غير متوازنة — الفرق: ${money(diff0)}</span>`;

  return `<div class="sheet">
    <div class="statement-header">
      <div class="company">${esc(c.customerName || "")}</div>
      <div class="entity">${entityLine(c)}</div>
      <div class="title">${esc(statement.title || "قائمة المركز المالي")}</div>
      <div class="date">كما في ${fiscalDateLabel(c)}</div>
    </div>
    <table class="fs">
      <thead><tr><th class="caption col-caption">البيان</th><th class="col-note">إيضاح</th>${P.amountHeads}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
    <div class="footnote">الإيضاحات المرفقة تعتبر جزءاً لا يتجزأ من القوائم المالية</div>
    <div class="footnote">${balanceNote}</div>
  </div>`;
}

function incomeBody(statement) {
  const c = statement.contract || {};
  const rows = [];
  const sectionByKey = Object.fromEntries((statement.sections || []).map((s) => [s.key, s]));
  const P = periodSetup(statement);

  const pushLines = (sec, { asDeduction = false } = {}) => {
    if (!sec) return;
    const cell = asDeduction ? P.negCells : P.cells;
    rows.push(`<tr class="section-head"><td class="col-caption" colspan="${P.colspan}">${esc(sec.title)}</td></tr>`);
    for (const g of sec.groups || []) {
      for (const line of g.lines || []) {
        rows.push(`<tr class="line"><td class="col-caption">${esc(line.name)}</td><td class="note">${line.note ?? ""}</td>${cell(line.amounts)}</tr>`);
      }
    }
    rows.push(`<tr class="section-total"><td class="col-caption">مجموع ${esc(sec.title)}</td><td></td>${cell(sec.totals)}</tr>`);
  };

  pushLines(sectionByKey.REVENUE);
  pushLines(sectionByKey.EXPENSE, { asDeduction: true });

  const t = statement.totals || {};
  const zeros = (t.netResult || [0]).map(() => 0);
  // صافي الربح/الخسارة → الدخل الشامل الآخر (لا يوجد حالياً) → إجمالي الدخل الشامل
  rows.push(`<tr class="section-total"><td class="col-caption">${esc(t.netResultLabel || "صافي ربح / (خسارة) السنة")}</td><td></td>${P.cells(t.netResult)}</tr>`);
  rows.push(`<tr class="line"><td class="col-caption">الدخل الشامل الآخر للسنة</td><td></td>${P.cells(zeros)}</tr>`);
  rows.push(`<tr class="grand-total"><td class="col-caption">إجمالي الدخل الشامل للسنة</td><td></td>${P.cells(t.netResult)}</tr>`);

  return `<div class="sheet">
    <div class="statement-header">
      <div class="company">${esc(c.customerName || "")}</div>
      <div class="entity">${entityLine(c)}</div>
      <div class="title">${esc(statement.title || "قائمة الدخل الشامل")}</div>
      <div class="date">للسنة المالية المنتهية في ${fiscalDateLabel(c)}</div>
    </div>
    <table class="fs">
      <thead><tr><th class="caption col-caption">البيان</th><th class="col-note">إيضاح</th>${P.amountHeads}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
    <div class="footnote">الإيضاحات المرفقة تعتبر جزءاً لا يتجزأ من القوائم المالية</div>
  </div>`;
}

// Public single-statement renderers (used by the JSON/PDF endpoints).
function renderPositionStatement(statement) {
  return htmlDoc(positionBody(statement));
}
function renderIncomeStatement(statement) {
  return htmlDoc(incomeBody(statement));
}

module.exports = {
  money,
  esc,
  entityLine,
  fiscalDateLabel,
  fiscalPeriodText,
  AR_MONTHS,
  htmlHead,
  htmlDoc,
  positionBody,
  incomeBody,
  renderPositionStatement,
  renderIncomeStatement,
};
