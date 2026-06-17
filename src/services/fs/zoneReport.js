/**
 * Zone-parity full report (BuildSpec_FSM_ZoneParity).
 * Renders the financial statements + notes in the EXACT Zone order/format,
 * driven by zoneCatalog. Reuses the rollup engine (financialStatements.service)
 * for amounts and the shared equity/cash-flow/auditor sections.
 */
const svc = require("../financialStatements.service");
const { getExtras } = require("./fsExtras");
const cat = require("./zoneCatalog");
const RS = require("../../utils/fileHandlers/renderReportSections");
const { money, esc, entityLine, fiscalPeriodText, fiscalDateLabel, htmlDoc } = require("../../utils/fileHandlers/renderStatementHtml");

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const isZeroAll = (arr) => arr.every((v) => Math.abs(v) < 0.005);
const FRAMEWORKS = {
  IFRS: "للمعايير الدولية للتقارير المالية المعتمدة في المملكة العربية السعودية",
  SME: "للمعيار الدولي للتقارير المالية للمنشآت الصغيرة والمتوسطة المعتمد في المملكة العربية السعودية",
};

/** Amounts of a catalog line (by standard code) across all periods. */
function lineAmounts(periodModels, code, credit) {
  return periodModels.map((m) => {
    const n = m.byAccountNumber.get(String(code));
    const v = n ? r2(n.amount) : 0;
    return credit ? -v : v; // credit-nature shown positive
  });
}

/** Period column labels (current first). */
function periodLabels(periodModels) {
  return periodModels.map((m) => svc.defaultPeriodLabel(m));
}

// --- Note numbering (general policies 1..G; line notes from 6 by appearance) ---
function assignNotes(periodModels, extras) {
  const notes = {}; // lineKey -> note number
  let n = 6;
  for (const line of cat.LINES) {
    if (line.noteType === "NONE") continue;
    const credit = ["CURRENT_LIAB", "NONCURRENT_LIAB", "EQUITY", "INC_REVENUE", "INC_OTHER"].includes(line.section);
    const amounts = lineAmounts(periodModels, line.code, credit);
    if (isZeroAll(amounts)) continue; // zero in all periods → no note (BuildSpec §1.4-f)
    notes[line.key] = n++;
  }
  return notes;
}

// --- Statement of Financial Position (Zone order) ---
function positionSheet(contract, periodModels, notes, terms) {
  const labels = periodLabels(periodModels);
  const np = periodModels.length;
  const head = `<div class="statement-header">
    <div class="company">${esc(contract.customerName || "")}</div>
    <div class="entity">${entityLine(contract)}</div>
    <div class="title">قائمة المركز المالي</div>
    <div class="date">كما في ${fiscalDateLabel(contract)}</div></div>`;

  const colHead = labels.map((l) => `<th class="col-amount">${esc(l)}</th>`).join("");
  const rows = [];
  const sectionTotal = {};

  const renderSection = (sectionKey) => {
    const sec = cat.SECTIONS[sectionKey];
    const credit = ["CURRENT_LIAB", "NONCURRENT_LIAB", "EQUITY"].includes(sectionKey);
    rows.push(`<tr class="section-head"><td class="col-caption">${esc(sec.title)}</td><td></td>${labels.map(() => "<td></td>").join("")}</tr>`);
    const totals = labels.map(() => 0);
    for (const line of cat.LINES.filter((l) => l.section === sectionKey)) {
      const amounts = lineAmounts(periodModels, line.code, credit);
      if (isZeroAll(amounts)) continue;
      amounts.forEach((v, i) => (totals[i] += v));
      const note = notes[line.key] ? `<td class="note">${notes[line.key]}</td>` : "<td></td>";
      rows.push(`<tr class="line"><td class="col-caption">${esc(line.label)}</td>${note}${amounts.map((v) => `<td class="amount">${money(v)}</td>`).join("")}</tr>`);
    }
    const subtitle = (sec.subtotal || "").replace("{{EQUITY_WORD}}", terms.equityWord);
    rows.push(`<tr class="subtotal"><td class="col-caption">${esc(subtitle)}</td><td></td>${totals.map((v) => `<td class="amount">${money(v)}</td>`).join("")}</tr>`);
    sectionTotal[sectionKey] = totals;
  };

  renderSection("CURRENT_ASSETS");
  renderSection("NONCURRENT_ASSETS");
  const totalAssets = labels.map((_, i) => r2(sectionTotal.CURRENT_ASSETS[i] + sectionTotal.NONCURRENT_ASSETS[i]));
  rows.push(`<tr class="section-total"><td class="col-caption">إجمالي الموجودات</td><td></td>${totalAssets.map((v) => `<td class="amount">${money(v)}</td>`).join("")}</tr>`);

  renderSection("CURRENT_LIAB");
  renderSection("NONCURRENT_LIAB");
  renderSection("EQUITY");
  const totalLiab = labels.map((_, i) => r2(sectionTotal.CURRENT_LIAB[i] + sectionTotal.NONCURRENT_LIAB[i]));
  const totalEquity = sectionTotal.EQUITY;
  const totalLE = labels.map((_, i) => r2(totalLiab[i] + totalEquity[i]));
  rows.push(`<tr class="grand-total"><td class="col-caption">إجمالي المطلوبات وحقوق الملكية</td><td></td>${totalLE.map((v) => `<td class="amount">${money(v)}</td>`).join("")}</tr>`);

  const balanced = Math.abs(totalAssets[0] - totalLE[0]) < 1;
  const note = balanced
    ? `<span class="balance-ok">✔ متوازنة: إجمالي الموجودات = المطلوبات + حقوق الملكية (${money(totalAssets[0])})</span>`
    : `<span class="balance-fail">⚠ غير متوازنة بفرق ${money(totalAssets[0] - totalLE[0])}</span>`;

  return `<div class="sheet">${head}
    <table class="fs"><thead><tr><th class="caption col-caption">البيان</th><th class="col-note">إيضاح</th>${colHead}</tr></thead>
    <tbody>${rows.join("")}</tbody></table>
    <div class="footnote">${note}</div>
    <div class="footnote">الإيضاحات المرفقة تعتبر جزءاً لا يتجزأ من القوائم المالية</div></div>`;
}

// --- Statement of Comprehensive Income (Zone order) ---
function incomeSheet(contract, periodModels, notes) {
  const labels = periodLabels(periodModels);
  const colHead = labels.map((l) => `<th class="col-amount">${esc(l)}</th>`).join("");
  const A = (code, credit) => lineAmounts(periodModels, code, credit);

  const revenue = A(cat.STD.REVENUE, true);
  const cost = A(cat.STD.COST_OF_REVENUE, false);
  const gross = labels.map((_, i) => r2(revenue[i] - cost[i]));
  const selling = A(cat.STD.SELLING_EXPENSES, false);
  const admin = A(cat.STD.GENERAL_ADMIN, false);
  const finance = A(cat.STD.FINANCE_COSTS, false);
  const opex = labels.map((_, i) => r2(selling[i] + admin[i] + finance[i]));
  const operating = labels.map((_, i) => r2(gross[i] - opex[i]));
  const other = A(cat.STD.OTHER_INCOME, true);
  const beforeZakat = labels.map((_, i) => r2(operating[i] + other[i]));
  const zakat = A(cat.STD.ZAKAT_PROVISION, true).map((v) => Math.abs(v)); // provision balance proxy; charge from extras handled in note
  const net = labels.map((_, i) => r2(beforeZakat[i] - zakat[i]));
  const oci = A(cat.STD.REMEASUREMENT_RESERVE, false).map((v) => -v); // debit loss → negative OCI
  const totalCI = labels.map((_, i) => r2(net[i] + oci[i]));

  const noteCell = (key) => (notes[key] ? `<td class="note">${notes[key]}</td>` : "<td></td>");
  const row = (label, vals, key, cls = "line", neg = false) =>
    `<tr class="${cls}"><td class="col-caption">${esc(label)}</td>${key ? noteCell(key) : "<td></td>"}${vals.map((v) => `<td class="amount">${money(neg ? -v : v)}</td>`).join("")}</tr>`;

  const head = `<div class="statement-header">
    <div class="company">${esc(contract.customerName || "")}</div>
    <div class="entity">${entityLine(contract)}</div>
    <div class="title">قائمة الدخل الشامل</div>
    <div class="date">${fiscalPeriodText(contract)}</div></div>`;

  const rows = [
    `<tr class="section-head"><td class="col-caption" colspan="${2 + labels.length}">العمليات المستمرة</td></tr>`,
    row("الإيرادات", revenue, "REVENUE"),
    row("تكلفة الإيرادات", cost, "COST_OF_REVENUE", "line", true),
    row("إجمالي الربح", gross, null, "subtotal"),
    `<tr class="section-head"><td class="col-caption" colspan="${2 + labels.length}">مصاريف العمليات</td></tr>`,
    row("مصروفات بيعية وتسويقية", selling, "SELLING_EXPENSES", "line", true),
    row("مصروفات عمومية وإدارية", admin, "GENERAL_ADMIN", "line", true),
    row("مصروفات تمويلية", finance, "FINANCE_COSTS", "line", true),
    row("مجموع المصروفات", opex, null, "subtotal", true),
    row("إجمالي أرباح التشغيل", operating, null, "subtotal"),
    row("إيرادات أخرى", other, "OTHER_INCOME"),
    row("مجمل ربح العام قبل الزكاة", beforeZakat, null, "subtotal"),
    row("الزكاة الشرعية", zakat, "ZAKAT_PROVISION", "line", true),
    row("صافي الدخل", net, null, "section-total"),
    `<tr class="section-head"><td class="col-caption" colspan="${2 + labels.length}">الدخل الشامل الآخر</td></tr>`,
    row("صافي الدخل الشامل الآخر", oci, "REMEASUREMENT_RESERVE"),
    row("إجمالي الدخل الشامل للسنة", totalCI, null, "grand-total"),
  ];

  return `<div class="sheet">${head}
    <table class="fs"><thead><tr><th class="caption col-caption">البيان</th><th class="col-note">إيضاح</th>${colHead}</tr></thead>
    <tbody>${rows.join("")}</tbody></table>
    <div class="footnote">الإيضاحات المرفقة تعتبر جزءاً لا يتجزأ من القوائم المالية</div></div>`;
}

const { notesSheet } = require("./zoneNotes");

const FW_NOUN = {
  IFRS: "المعايير الدولية للتقارير المالية المعتمدة في المملكة العربية السعودية",
  SME: "المعيار الدولي للتقارير المالية للمنشآت الصغيرة والمتوسطة المعتمد في المملكة العربية السعودية",
};

/** Build the complete Zone-format report HTML for an engagement. */
async function generateZoneReportHtml(contractId, options = {}) {
  const periodModels = await svc._loadModels(contractId);
  const contract = periodModels[0].contract;
  const extras = await getExtras(contractId);
  const auditor = await svc.loadAuditor(contract.subscriberId, options.reportDate);
  const terms = RS.entityTerms(contract.legalEntity);
  const fwKey = String(options.framework || extras.framework || "IFRS").toUpperCase();
  const fwNoun = FW_NOUN[fwKey] || FW_NOUN.IFRS;
  const fwLam = FRAMEWORKS[fwKey] || FRAMEWORKS.IFRS;
  const isTransition = !!extras.transition;
  const opinionType = (options.opinionType || "UNQUALIFIED").toUpperCase();

  // Generic shape (for the shared equity + cash-flow movement logic).
  const noteSeq = { next: 999 }; // notes already numbered by the catalog; keep these out of the way
  const genPos = svc.buildPositionStatement(periodModels, noteSeq);
  const genInc = svc.buildIncomeStatement(periodModels, noteSeq);

  const notes = assignNotes(periodModels, extras);

  return htmlDoc(
    RS.coverBody(contract),
    RS.indexBody(contract, terms),
    RS.auditorReportBody(contract, { opinionType, terms, framework: fwNoun, auditor, emphasis: options.emphasis || null }),
    positionSheet(contract, periodModels, notes, terms),
    incomeSheet(contract, periodModels, notes),
    RS.changesInEquityBody(contract, genPos, genInc, terms),
    RS.cashFlowsBody(contract, genPos, genInc, terms),
    notesSheet(contract, periodModels, extras, notes, terms, fwLam, isTransition)
  );
}

module.exports = { positionSheet, incomeSheet, lineAmounts, assignNotes, periodLabels, FRAMEWORKS, generateZoneReportHtml };
