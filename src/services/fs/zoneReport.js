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

/** Period column labels (current first). On transition the oldest column is the
 *  opening date, labelled "1 يناير {year+1}" instead of "31 ديسمبر {year}". */
function periodLabels(periodModels, isTransition) {
  const labels = periodModels.map((m) => svc.defaultPeriodLabel(m));
  if (isTransition && labels.length >= 3) {
    const oldest = periodModels[periodModels.length - 1];
    const y = /^\d{4}$/.test(oldest.period || "") ? Number(oldest.period) + 1 : null;
    if (y) labels[labels.length - 1] = `1 يناير ${y}`;
  }
  return labels;
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
function positionSheet(contract, periodModels, notes, terms, isTransition) {
  const labels = periodLabels(periodModels, isTransition);
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

  // Level-1 master heading row for a group (الموجودات / المطلوبات / حقوق الملكية).
  const groupHead = (title) => rows.push(`<tr class="group-head"><td class="col-caption">${esc(title)}</td><td></td>${labels.map(() => "<td></td>").join("")}</tr>`);

  groupHead("الموجودات");
  renderSection("CURRENT_ASSETS");
  renderSection("NONCURRENT_ASSETS");
  const totalAssets = labels.map((_, i) => r2(sectionTotal.CURRENT_ASSETS[i] + sectionTotal.NONCURRENT_ASSETS[i]));
  rows.push(`<tr class="section-total"><td class="col-caption">إجمالي الموجودات</td><td></td>${totalAssets.map((v) => `<td class="amount">${money(v)}</td>`).join("")}</tr>`);

  groupHead(`المطلوبات و${terms.equityWord}`);
  renderSection("CURRENT_LIAB");
  renderSection("NONCURRENT_LIAB");
  const totalLiabOnly = labels.map((_, i) => r2(sectionTotal.CURRENT_LIAB[i] + sectionTotal.NONCURRENT_LIAB[i]));
  rows.push(`<tr class="section-total"><td class="col-caption">مجموع المطلوبات</td><td></td>${totalLiabOnly.map((v) => `<td class="amount">${money(v)}</td>`).join("")}</tr>`);
  groupHead(terms.equityWord);
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
  // Income statement is presented for the year + comparative only (never the opening date).
  const incPM = periodModels.slice(0, 2);
  const labels = periodLabels(incPM, false);
  const colHead = labels.map((l) => `<th class="col-amount">${esc(l)}</th>`).join("");
  const A = (code, credit) => lineAmounts(incPM, code, credit);

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

// --- Statement of changes in equity (Zone matrix) ---------------------------
// Columns: capital · statutory reserve · retained earnings · remeasurement · total.
// Rows roll forward across every displayed year and reconcile by construction.
function equitySheet(contract, periodModels, genInc, terms) {
  const np = periodModels.length;
  const netResult = (genInc && genInc.totals && genInc.totals.netResult) || [];
  // equity contribution of a component = −(stored amount): credit balances positive,
  // debit losses (remeasurement) negative; the four sum to total equity.
  const comp = (i) => {
    const g = (code) => { const n = periodModels[i] && periodModels[i].byAccountNumber.get(String(code)); return n ? -r2(n.amount) : 0; };
    return { capital: g(cat.STD.CAPITAL), reserve: g(cat.STD.STATUTORY_RESERVE), retained: g(cat.STD.RETAINED_EARNINGS), remeasure: g(cat.STD.REMEASUREMENT_RESERVE) };
  };
  const yearOf = (i) => (/^\d{4}$/.test(periodModels[i].period || "") ? Number(periodModels[i].period) : null);
  const cell = (v) => `<td class="amount">${v === 0 ? "-" : money(v)}</td>`;
  const total = (o) => r2(o.capital + o.reserve + o.retained + o.remeasure);
  const row = (label, o, cls = "line") => `<tr class="${cls}"><td class="col-caption">${esc(label)}</td>${cell(o.capital || 0)}${cell(o.reserve || 0)}${cell(o.retained || 0)}${cell(o.remeasure || 0)}<td class="amount">${money(total(o))}</td></tr>`;

  // oldest → newest. لفترة واحدة (شركة في سنتها الأولى) لا توجد حركة مقارنة.
  const order = np >= 3 ? [2, 1, 0] : (np >= 2 ? [1, 0] : [0]);
  const rows = [];
  if (order.length < 2) {
    // فترة واحدة فقط: نعرض رصيد الإقفال دون جدول حركة السنة السابقة.
    const y = yearOf(order[0]);
    rows.push(row(`الرصيد في 31 ديسمبر ${y != null ? y : ""}م`, comp(order[0]), "section-total"));
  } else {
    const openIdx = order[0];
    const openY = yearOf(openIdx);
    rows.push(row(`الرصيد في 1 يناير ${openY != null ? openY + 1 : ""}م`, comp(openIdx), "subtotal"));
    for (let k = 1; k < order.length; k++) {
      const pIdx = order[k - 1], cIdx = order[k];
      const p = comp(pIdx), c = comp(cIdx);
      const ni = r2(netResult[cIdx] || 0);
      const oci = r2(c.remeasure - p.remeasure);
      const transfer = r2(c.reserve - p.reserve);
      const capChange = r2(c.capital - p.capital);
      const distributions = r2((p.retained + ni - transfer) - c.retained); // plug on retained
      if (ni) rows.push(row("صافي الدخل للسنة", { retained: ni }));
      if (oci) rows.push(row("الدخل الشامل الآخر", { remeasure: oci }));
      if (transfer) rows.push(row("المحوّل للاحتياطي النظامي", { reserve: transfer, retained: -transfer }));
      if (capChange) rows.push(row("التغير في رأس المال", { capital: capChange }));
      if (distributions) rows.push(row("توزيعات أرباح / مسحوبات", { retained: -distributions }));
      rows.push(row(`الرصيد في 31 ديسمبر ${yearOf(cIdx)}م`, c, "section-total"));
    }
  }

  const th = (t) => `<th class="col-amount">${esc(t)}</th>`;
  const head = `<thead><tr><th class="caption col-caption">البيان</th>${th("رأس المال")}${th("الاحتياطي النظامي")}${th("الأرباح (الخسائر) المبقاة")}${th("إعادة قياس منافع الموظفين")}${th("المجموع")}</tr></thead>`;
  return `<div class="sheet">
    <div class="statement-header"><div class="company">${esc(contract.customerName || "")}</div><div class="entity">${entityLine(contract)}</div>
      <div class="title">${esc(terms.equityTitle || "قائمة التغيرات في حقوق الملكية")}</div>
      <div class="date">${fiscalPeriodText(contract)}</div></div>
    <table class="fs">${head}<tbody>${rows.join("")}</tbody></table>
    <div class="footnote">الإيضاحات المرفقة تعتبر جزءاً لا يتجزأ من القوائم المالية</div></div>`;
}

// --- Transition section (first-time adoption): effect-of-correction tables ---
// Demo: no material remeasurement; adjustment columns are zero and the post-adoption
// figure equals the previous-framework figure (only reclassification, per IFRS 1).
function transitionSection(contract, periodModels, notes, terms) {
  const compIdx = Math.min(1, periodModels.length - 1); // comparative year
  const compLabel = svc.defaultPeriodLabel(periodModels[compIdx]);
  const val = (code, credit) => lineAmounts(periodModels, code, credit)[compIdx] || 0;

  const COLS = ["وفقاً للمعايير المحاسبية السعودية", "إعادة التصنيف والتبويب", "إعادة القياس وتصحيح الأخطاء", "القوائم بعد التطبيق"];
  const th = (t) => `<th class="col-amount">${esc(t)}</th>`;
  const colHead = `<thead><tr><th class="caption col-caption">البيان</th><th class="col-note">إيضاح</th>${COLS.map(th).join("")}</tr></thead>`;
  const fourCols = (v) => `<td class="amount">${money(v)}</td><td class="amount">-</td><td class="amount">-</td><td class="amount">${money(v)}</td>`;
  const noteCell = (key) => (notes[key] ? `<td class="note">${notes[key]}</td>` : "<td></td>");

  const lineRow = (line, credit) => {
    const v = val(line.code, credit);
    if (Math.abs(v) < 0.5) return "";
    return `<tr class="line"><td class="col-caption">${esc(line.label)}</td>${noteCell(line.key)}${fourCols(v)}</tr>`;
  };
  const totalRow = (label, v) => `<tr class="section-total"><td class="col-caption">${esc(label)}</td><td></td>${fourCols(v)}</tr>`;

  // 3.1 Position
  const bsSecK = { CURRENT_ASSETS: false, NONCURRENT_ASSETS: false, CURRENT_LIAB: true, NONCURRENT_LIAB: true, EQUITY: true };
  const posRows = [];
  let ta = 0, tle = 0;
  for (const [sk, credit] of Object.entries(bsSecK)) {
    const sec = cat.SECTIONS[sk];
    posRows.push(`<tr class="section-head"><td class="col-caption">${esc(sec.title)}</td><td></td><td></td><td></td><td></td><td></td></tr>`);
    for (const line of cat.LINES.filter((l) => l.section === sk)) {
      const r = lineRow(line, credit);
      if (r) { posRows.push(r); const v = val(line.code, credit); if (sk.includes("ASSET")) ta += v; else tle += v; }
    }
  }

  // 3.2 Income
  const inc = (code, credit) => val(code, credit);
  const rev = inc(cat.STD.REVENUE, true), cost = inc(cat.STD.COST_OF_REVENUE, false);
  const gross = r2(rev - cost);
  const sell = inc(cat.STD.SELLING_EXPENSES, false), adm = inc(cat.STD.GENERAL_ADMIN, false), fin = inc(cat.STD.FINANCE_COSTS, false);
  const other = inc(cat.STD.OTHER_INCOME, true), zak = Math.abs(inc(cat.STD.ZAKAT_PROVISION, true));
  const net = r2(gross - sell - adm - fin + other - zak);
  const incRow = (label, v, cls = "line") => `<tr class="${cls}"><td class="col-caption">${esc(label)}</td><td></td>${fourCols(v)}</tr>`;

  return `<div class="sheet">
    <div class="statement-header"><div class="company">${esc(contract.customerName || "")}</div><div class="entity">${entityLine(contract)}</div>
      <div class="title">التسويات وأثر الانتقال إلى المعايير الدولية للتقارير المالية لأول مرة</div></div>
    <div class="footnote" style="text-align:right">يوضح ما يلي أثر التصحيح عند الانتقال من الإطار المحاسبي السابق؛ البيانات تجريبية والأعمدة متوازنة.</div>

    <div class="note-title" style="margin-top:8px">3.1 أثر التصحيح على قائمة المركز المالي كما في ${esc(compLabel)}</div>
    <table class="fs">${colHead}<tbody>${posRows.join("")}
      ${totalRow("إجمالي الموجودات", ta)}${totalRow("إجمالي المطلوبات وحقوق الملكية", tle)}</tbody></table>

    <div class="note-title" style="margin-top:10px">3.2 أثر التصحيح على قائمة الدخل للسنة المنتهية في ${esc(compLabel)}</div>
    <table class="fs">${colHead}<tbody>
      ${incRow("الإيرادات", rev)}${incRow("تكلفة الإيرادات", -cost)}${incRow("مجمل الربح", gross, "subtotal")}
      ${incRow("مصروفات بيعية وتسويقية", -sell)}${incRow("مصروفات عمومية وإدارية", -adm)}${incRow("مصروفات تمويلية", -fin)}
      ${incRow("إيرادات أخرى", other)}${incRow("الزكاة الشرعية", -zak)}${incRow("صافي الدخل", net, "section-total")}</tbody></table>

    <div class="footnote" style="text-align:right;margin-top:8px">ملاحظة تطبيقية: لم ينتج عن الانتقال أثر جوهري على القياس؛ واقتصرت التعديلات على إعادة التبويب لتتوافق مع العرض وفق المعايير الدولية، وذلك وفق المعيار الدولي للتقرير المالي رقم (1).</div>
  </div>`;
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

  const sections = [
    RS.coverBody(contract),
    RS.indexBody(contract, terms),
    RS.auditorReportBody(contract, { opinionType, terms, framework: fwNoun, auditor, emphasis: options.emphasis || null }),
    positionSheet(contract, periodModels, notes, terms, isTransition),
    incomeSheet(contract, periodModels, notes),
    equitySheet(contract, periodModels, genInc, terms),
    RS.cashFlowsBody(contract, genPos, genInc, terms),
  ];
  if (isTransition) sections.push(transitionSection(contract, periodModels, notes, terms));
  sections.push(notesSheet(contract, periodModels, extras, notes, terms, fwLam, isTransition));

  return htmlDoc(...sections);
}

module.exports = { positionSheet, incomeSheet, lineAmounts, assignNotes, periodLabels, FRAMEWORKS, generateZoneReportHtml };
