/**
 * Zone-parity notes section (BuildSpec §4/§5): entity info, general policies,
 * and one note per statement line in the catalog with the correct type
 * (breakdown / movement table / actuarial / zakat / lease / capital / related).
 */
const svc = require("../financialStatements.service");
const cat = require("./zoneCatalog");
const { money, esc, entityLine, fiscalPeriodText } = require("../../utils/fileHandlers/renderStatementHtml");

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const FW_LAM = (fw) => fw; // framework already starts with ل... in zoneReport.FRAMEWORKS

function entityInfoNote(contract) {
  const c = contract || {};
  const row = (l, v) => (v ? `<tr><td class="col-caption">${esc(l)}</td><td>${esc(v)}</td></tr>` : "");
  return `<div class="note-block"><div class="note-title">1. تعريف المنشأة ونشاطها</div>
    <div class="para">تمارس ${esc(c.customerName || "المنشأة")} نشاطها في المملكة العربية السعودية بموجب سجلها التجاري وتراخيصها السارية.</div>
    <table class="mini">
      ${row("السجل التجاري", c.commercialRegisterNumber)}${row("الرقم الضريبي", c.taxNumber)}${row("الرقم الموحد", c.unifiedNumber)}
      ${row("العنوان", c.address)}${row("الرمز البريدي", c.postalCode)}${row("الجوال", c.contactPhone)}${row("البريد الإلكتروني", c.email)}
    </table></div>`;
}

function generalPoliciesNote(framework, isTransition) {
  const items = cat.GENERAL_POLICIES.filter((p) => !p.onlyTransition || isTransition);
  const body = items
    .map((p, i) => `<div class="para"><b>${i + 1}.${i + 1} ${esc(p.title)}:</b> ${esc(p.text.replace("{{FRAMEWORK}}", framework))}</div>`)
    .join("");
  return `<div class="note-block"><div class="note-title">2. السياسات المحاسبية العامة</div>${body}</div>`;
}

/** Detail rows (Level-4) of a line across periods, aligned by account code. */
function detailByPeriod(periodModels, code) {
  const maps = periodModels.map((m) => {
    const map = new Map();
    for (const d of svc.getLineDetail(m, Number(code)) || []) map.set(d.accountCode, d);
    return map;
  });
  const codes = [];
  const seen = new Set();
  for (const map of maps) for (const k of map.keys()) if (!seen.has(k)) { seen.add(k); codes.push(k); }
  return codes.map((c) => ({
    code: c,
    name: (maps[0].get(c) || maps.find((mm) => mm.get(c)).get(c)).accountName,
    amounts: maps.map((map) => (map.get(c) ? r2(map.get(c).amount) : 0)),
  }));
}

const amtCols = (vals, credit) => vals.map((v) => `<td class="amount">${money(credit ? -v : v)}</td>`).join("");

/** Header row with the period (year) labels above the value columns. */
const periodHead = (labels) =>
  `<thead><tr><th class="col-caption">البيان</th>${(labels || []).map((l) => `<th class="amount">${esc(l)}</th>`).join("")}</tr></thead>`;

function breakdownNote(no, line, periodModels, np, extras, labels) {
  const credit = ["CURRENT_LIAB", "NONCURRENT_LIAB", "EQUITY", "INC_REVENUE", "INC_OTHER"].includes(line.section) || line.negative;
  const det = detailByPeriod(periodModels, line.code).filter((d) => !d.amounts.every((v) => Math.abs(v) < 0.005));
  const tot = Array.from({ length: np }, (_, i) => det.reduce((s, d) => s + d.amounts[i], 0));
  const rows = det.map((d) => `<tr><td class="col-caption">${esc(d.name)}</td>${amtCols(d.amounts, credit)}</tr>`).join("");
  // optional provision sub-block (doubtful debts / slow inventory)
  let prov = "";
  if (line.provision && extras.provisions) {
    const pcode = line.code === "112" ? "1122" : null;
    const p = pcode && extras.provisions[pcode];
    if (p) prov = `<tr class="subtotal"><td class="col-caption">${esc(line.provision)} (آخر المدة)</td>${amtCols(Array.from({ length: np }, () => -(p.begin + p.charge - (p.used || 0))), false)}</tr>`;
  }
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText || "")}</div>
    <table class="mini">${periodHead(labels)}<tbody>${rows}${prov}<tr class="tot"><td class="col-caption">المجموع</td>${amtCols(tot, credit)}</tr></tbody></table></div>`;
}

function ppeNote(no, line, extras, np) {
  const classes = extras.ppeClasses || [];
  const th = (t) => `<th style="border-bottom:1px solid #111;padding:2px 3px;font-size:9px">${esc(t)}</th>`;
  const head = `<tr>${["البند", "نسبة الإهلاك", "التكلفة أول المدة", "إضافات", "استبعادات", "التكلفة آخر المدة", "مجمع الإهلاك أول المدة", "إهلاك العام", "استبعادات الإهلاك", "مجمع الإهلاك آخر المدة", "صافي القيمة الدفترية"].map(th).join("")}</tr>`;
  let t = { cb: 0, a: 0, d: 0, ce: 0, db: 0, dc: 0, dd: 0, de: 0, nbv: 0 };
  const rows = classes.map((c) => {
    const ce = c.costBeg + c.additions - c.disposals;
    const de = c.depBeg + c.depCharge - c.depDisposals;
    const nbv = ce - de;
    t = { cb: t.cb + c.costBeg, a: t.a + c.additions, d: t.d + c.disposals, ce: t.ce + ce, db: t.db + c.depBeg, dc: t.dc + c.depCharge, dd: t.dd + c.depDisposals, de: t.de + de, nbv: t.nbv + nbv };
    const cell = (v) => `<td class="amount" style="font-size:9px">${money(v)}</td>`;
    return `<tr><td class="col-caption" style="font-size:9px">${esc(c.name)}</td><td class="amount" style="font-size:9px">${esc(c.rate)}</td>${cell(c.costBeg)}${cell(c.additions)}${cell(-c.disposals)}${cell(ce)}${cell(c.depBeg)}${cell(c.depCharge)}${cell(-c.depDisposals)}${cell(de)}${cell(nbv)}</tr>`;
  }).join("");
  const cell = (v) => `<td class="amount" style="font-size:9px">${money(v)}</td>`;
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <table class="mini" style="width:100%"><thead>${head}</thead><tbody>${rows}
      <tr class="tot"><td class="col-caption" style="font-size:9px">المجموع</td><td></td>${cell(t.cb)}${cell(t.a)}${cell(-t.d)}${cell(t.ce)}${cell(t.db)}${cell(t.dc)}${cell(-t.dd)}${cell(t.de)}${cell(t.nbv)}</tr>
    </tbody></table></div>`;
}

function moveCostNote(no, line, periodModels, labels) {
  // cost side + accumulated amort/dep side from the trial-balance movement columns,
  // computed PER PERIOD so the note shows a column per year (current + comparative).
  const isAccum = (n) => /(مجمع|مجمّع).*(إهلاك|اهلاك|إطفاء|اطفاء)/.test(String(n || ""));
  const per = periodModels.map((m) => {
    const det = svc.getLineDetail(m, Number(line.code)) || [];
    const cost = det.filter((d) => !isAccum(d.accountName));
    const acc = det.filter((d) => isAccum(d.accountName));
    const sum = (arr, f) => arr.reduce((s, d) => s + f(d), 0);
    const cb = sum(cost, (d) => d.beginningDebit || 0), ca = sum(cost, (d) => d.debitMovement || 0), cd = sum(cost, (d) => d.creditMovement || 0);
    const ab = sum(acc, (d) => d.beginningCredit || 0), ac = sum(acc, (d) => d.creditMovement || 0), ad = sum(acc, (d) => d.debitMovement || 0);
    return { cb, ca, cd, ce: cb + ca - cd, ab, ac, ad, ae: ab + ac - ad };
  });
  const cells = (f) => per.map((p) => `<td class="amount">${money(f(p))}</td>`).join("");
  const row = (l, f, cls = "") => `<tr class="${cls}"><td class="col-caption">${esc(l)}</td>${cells(f)}</tr>`;
  const amort = esc(line.amortLabel || "مجمع الإطفاء");
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <table class="mini">${periodHead(labels)}<tbody>
      ${row("التكلفة أول المدة", (p) => p.cb)}${row("إضافات", (p) => p.ca)}${row("استبعادات", (p) => -p.cd)}${row("التكلفة آخر المدة", (p) => p.ce, "subtotal")}
      ${row(`${amort} أول المدة`, (p) => -p.ab)}${row("المحمّل خلال العام", (p) => -p.ac)}${row("استبعادات الإهلاك", (p) => p.ad)}${row(`${amort} آخر المدة`, (p) => -p.ae, "subtotal")}
      ${row("صافي القيمة الدفترية", (p) => p.ce - p.ae, "grand-total")}
    </tbody></table></div>`;
}

function provisionNote(no, line, periodModels, extras) {
  const p = (extras.provisions && extras.provisions[line.code]) || null;
  const credit = true;
  if (!p) return breakdownNote(no, line, periodModels, periodModels.length, extras);
  const closing = p.begin + p.charge - (p.used || 0);
  const row = (l, v) => `<tr><td class="col-caption">${esc(l)}</td><td class="amount">${money(v)}</td></tr>`;
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <table class="mini"><tbody>
      ${row("الرصيد أول السنة", p.begin)}${row("المكوّن خلال السنة", p.charge)}${row("المستخدم/المسدد", -(p.used || 0))}
      <tr class="grand-total"><td class="col-caption">الرصيد آخر السنة</td><td class="amount">${money(closing)}</td></tr>
    </tbody></table></div>`;
}

function empBenefitNote(no, line, extras) {
  const e = extras.employeeBenefits || {};
  const a = e.assumptions || {};
  const s = e.sensitivity || {};
  const row = (l, v) => `<tr><td class="col-caption">${esc(l)}</td><td class="amount">${money(v)}</td></tr>`;
  const arow = (l, v) => `<tr><td class="col-caption">${esc(l)}</td><td class="amount">${esc(v)}</td></tr>`;
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <table class="mini"><tbody>
      ${row("تكلفة الخدمة الحالية المكوّنة", e.serviceCost || 0)}${row("تكلفة الفائدة", e.interestCost || 0)}
      ${row("إعادة قياس (إلى الدخل الشامل الآخر)", e.remeasurement || 0)}${row("المسدد خلال السنة", -(e.paid || 0))}
    </tbody></table>
    <div class="para" style="margin-top:6px"><b>الفرضيات الاكتوارية:</b></div>
    <table class="mini"><tbody>${arow("معدل الخصم", a.discountRate)}${arow("معدل زيادة الرواتب", a.salaryGrowth)}${arow("معدل دوران الموظفين", a.turnover)}${arow("سن التقاعد", a.retirementAge)}${arow("عدد الموظفين", a.employees)}</tbody></table>
    <div class="para" style="margin-top:6px"><b>تحليل الحساسية (±1%):</b></div>
    <table class="mini"><tbody>${row("أثر معدل الخصم", s.discountRate || 0)}${row("أثر زيادة الرواتب", s.salaryGrowth || 0)}${row("أثر دوران الموظفين", s.turnover || 0)}</tbody></table></div>`;
}

function zakatNote(no, line, extras) {
  const z = extras.zakat || {};
  const row = (l, v) => `<tr><td class="col-caption">${esc(l)}</td><td class="amount">${money(v)}</td></tr>`;
  return `<div class="note-block"><div class="note-title">${no}. مخصص الزكاة الشرعية</div>
    <div class="para"><b>${no}-1 الوعاء الزكوي:</b></div>
    <table class="mini"><tbody>
      ${row("إجمالي الربح المعدّل", z.adjustedProfit || 0)}${row("مخصص منافع الموظفين المكوّن", z.employeeBenefitsCharge || 0)}
      ${row("رأس المال", z.capital || 0)}${row("الاحتياطي النظامي", z.statutoryReserve || 0)}${row("جاري الشركاء في حدود المحسوم", z.partnersBalance || 0)}${row("الأرباح المبقاة", z.retainedEarnings || 0)}
      ${row("ناقصاً: الأصول الثابتة (بالصافي)", z.netFixedAssets || 0)}
      <tr class="subtotal"><td class="col-caption">الوعاء الزكوي</td><td class="amount">${money(z.base || 0)}</td></tr>
      <tr class="grand-total"><td class="col-caption">الزكاة المستحقة (${esc(z.rate || "2.5%")})</td><td class="amount">${money(z.due || 0)}</td></tr>
    </tbody></table>
    <div class="para" style="margin-top:6px"><b>${no}-2 حركة المخصص:</b></div>
    <table class="mini"><tbody>${row("الرصيد أول السنة", (z.due || 0) - 0)}${row("المكوّن خلال السنة", z.due || 0)}${row("المدفوع خلال السنة", -(z.due || 0))}<tr class="grand-total"><td class="col-caption">الرصيد آخر السنة</td><td class="amount">${money(z.due || 0)}</td></tr></tbody></table></div>`;
}

function leaseNote(no, line, periodModels, extras) {
  const m = extras.leaseMaturity || {};
  const cur = periodModels[0].byAccountNumber.get(String(cat.STD.LEASE_CURRENT));
  const noncur = periodModels[0].byAccountNumber.get(String(cat.STD.LEASE_NONCURRENT));
  const row = (l, v) => `<tr><td class="col-caption">${esc(l)}</td><td class="amount">${money(v)}</td></tr>`;
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <div class="para"><b>جدول استحقاق الإيجارات:</b></div>
    <table class="mini"><tbody>${row("أقل من سنة", m.lessThanYear || 0)}${row("من سنة إلى 5 سنوات", m.oneToFive || 0)}${row("أكثر من 5 سنوات", m.moreThanFive || 0)}
      <tr class="tot"><td class="col-caption">الإجمالي</td><td class="amount">${money((m.lessThanYear || 0) + (m.oneToFive || 0) + (m.moreThanFive || 0))}</td></tr></tbody></table>
    <table class="mini" style="margin-top:6px"><tbody>${row("الجزء المتداول", cur ? -r2(cur.amount) : 0)}${row("الجزء غير المتداول", noncur ? -r2(noncur.amount) : 0)}</tbody></table></div>`;
}

function capitalNote(no, line, extras) {
  const s = extras.shares || {};
  const partners = s.partners || [];
  const rows = partners.map((p) => `<tr><td class="col-caption">${esc(p.name)}</td><td class="amount">${money(p.shares)}</td><td class="amount">${money(s.shareValue)}</td><td class="amount">${money(p.shares * (s.shareValue || 0))}</td><td class="amount">${esc(p.pct)}</td></tr>`).join("");
  const th = (t) => `<th style="border-bottom:1px solid #111;padding:2px 4px;font-size:10px">${esc(t)}</th>`;
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)} حُدّد رأس المال بمبلغ (${money(s.capital || 0)}) ريال مقسّم إلى (${money(s.totalShares || 0)}) حصة قيمة كل حصة (${money(s.shareValue || 0)}) ريال.</div>
    <table class="mini" style="width:100%"><thead><tr>${th("الشريك")}${th("عدد الحصص")}${th("قيمة الحصة")}${th("إجمالي الحصص")}${th("النسبة")}</tr></thead><tbody>${rows}
      <tr class="tot"><td class="col-caption">المجموع</td><td class="amount">${money(s.totalShares || 0)}</td><td></td><td class="amount">${money(s.capital || 0)}</td><td class="amount">100%</td></tr></tbody></table></div>`;
}

function relatedNote(no, line, extras, labels) {
  const rp = extras.relatedParties || [];
  const rows = rp.map((p) => `<tr><td class="col-caption">${esc(p.name)}</td><td class="amount">${money(p.v2024 || 0)}</td><td class="amount">${money(p.v2023 || 0)}</td></tr>`).join("");
  const t24 = rp.reduce((s, p) => s + (p.v2024 || 0), 0), t23 = rp.reduce((s, p) => s + (p.v2023 || 0), 0);
  const head = periodHead((labels || []).slice(0, 2));
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <table class="mini">${head}<tbody>${rows}<tr class="tot"><td class="col-caption">المجموع</td><td class="amount">${money(t24)}</td><td class="amount">${money(t23)}</td></tr></tbody></table></div>`;
}

function lineNote(no, line, periodModels, extras, np, labels) {
  switch (line.noteType) {
    case "PPE": return ppeNote(no, line, extras, np);
    case "MOVE_COST": return moveCostNote(no, line, periodModels, labels);
    case "EMP_BEN": return empBenefitNote(no, line, extras);
    case "ZAKAT": return zakatNote(no, line, extras);
    case "LEASE": return leaseNote(no, line, periodModels, extras);
    case "CAPITAL": return capitalNote(no, line, extras);
    case "RELATED": return relatedNote(no, line, extras, labels);
    case "PROVISION": return provisionNote(no, line, periodModels, extras);
    default: return breakdownNote(no, line, periodModels, np, extras, labels);
  }
}

/** Standard closing notes that always appear after the line notes (Zone 30–32). */
function closingNotes(startNo, contract, extras, terms) {
  let no = startNo;
  const block = (title, body) => `<div class="note-block"><div class="note-title">${no++}. ${esc(title)}</div>${body}</div>`;
  const p = (t) => `<div class="para">${t}</div>`;

  const risk = block("إدارة المخاطر المالية",
    p("تتعرض أنشطة المنشأة لمخاطر مالية تشمل مخاطر السوق (مخاطر العملات وأسعار العمولات والقيمة العادلة) ومخاطر الائتمان ومخاطر السيولة. ترّكز سياسة المنشأة على تحديد وتقييم ومراقبة هذه المخاطر للحد من آثارها السلبية، وفق المعيار الدولي للتقارير المالية رقم (7).") +
    p("<b>مخاطر العملات:</b> تتم غالبية معاملات المنشأة بالريال السعودي، ولا تتعرض لمخاطر جوهرية من تقلبات أسعار الصرف.") +
    p("<b>مخاطر الائتمان:</b> تنشأ من النقد لدى البنوك والذمم المدينة، وتُدار بإيداع النقد لدى بنوك ذات تصنيف جيد ومراقبة الذمم دورياً.") +
    p("<b>مخاطر السيولة:</b> تراقب الإدارة متطلبات السيولة لضمان توفر النقد الكافي للوفاء بالالتزامات عند استحقاقها."));

  const comparatives = block("أرقام المقارنة",
    p("أُعيد تصنيف بعض أرقام المقارنة للسنة السابقة، عند الضرورة، لتتوافق مع عرض وتصنيف السنة الحالية، ولم يكن لإعادة التصنيف أي أثر على صافي حقوق الملكية أو صافي الدخل للسنة السابقة، وفق معيار المحاسبة الدولي رقم (1)."));

  const subsequent = block("الأحداث اللاحقة لتاريخ القوائم المالية",
    p("لم تطرأ أحداث جوهرية بعد تاريخ القوائم المالية وحتى تاريخ اعتمادها من شأنها أن تتطلب تعديلاً في القوائم المالية أو الإفصاح عنها، وفق معيار المحاسبة الدولي رقم (10)."));

  const partners = (extras.shares && extras.shares.partners) || [];
  const sigRows = partners.length
    ? partners.map((pt) => `<tr><td class="col-caption">${esc(pt.name)}</td><td style="height:26px"></td></tr>`).join("")
    : `<tr><td class="col-caption">${esc(terms.equityWord || "الملاك")}</td><td style="height:26px"></td></tr>`;
  const approval = block("اعتماد القوائم المالية",
    p(`تم اعتماد هذه القوائم المالية من قبل ${esc(terms.managers || "الشركاء/مجلس المديرين")} بتاريخ ... / ... / ${(contract.fiscalYearEnd ? new Date(contract.fiscalYearEnd).getFullYear() + 1 : "")}م.`) +
    `<table class="mini"><thead><tr><th class="col-caption">الاسم</th><th>التوقيع</th></tr></thead><tbody>${sigRows}</tbody></table>`);

  return risk + comparatives + subsequent + approval;
}

function notesSheet(contract, periodModels, extras, notes, terms, framework, isTransition) {
  const labels = periodModels.map((m) => svc.defaultPeriodLabel(m));
  if (isTransition && labels.length >= 3) {
    const oldest = periodModels[periodModels.length - 1];
    const y = /^\d{4}$/.test(oldest.period || "") ? Number(oldest.period) + 1 : null;
    if (y) labels[labels.length - 1] = `1 يناير ${y}`;
  }
  // IFRS-1 application note shown under each note only on first-time adoption.
  const applyNote = isTransition
    ? `<div class="footnote" style="text-align:right;margin-top:4px">ملاحظة تطبيقية: عند التحول إلى المعايير الدولية للتقارير المالية، روجع الاعتراف والقياس والعرض لهذا البند ولم ينتج عن ذلك أثر جوهري، وذلك وفق المعيار الدولي للتقرير المالي رقم (1).</div>`
    : "";
  const blocks = cat.LINES.filter((l) => notes[l.key]).sort((a, b) => notes[a.key] - notes[b.key]).map((l) => {
    // income-statement notes are presented for the year + comparative only (no opening column).
    const isInc = String(l.section).startsWith("INC_");
    const pm = isInc ? periodModels.slice(0, 2) : periodModels;
    const lb = isInc ? labels.slice(0, 2) : labels;
    return lineNote(notes[l.key], l, pm, extras, pm.length, lb) + applyNote;
  }).join("");
  const maxNote = Math.max(5, ...Object.values(notes).filter((x) => typeof x === "number"));
  const closing = closingNotes(maxNote + 1, contract, extras, terms);
  return `<div class="sheet">
    <div class="report-head"><div class="company">${esc(contract.customerName || "")}</div><div>${entityLine(contract)}</div></div>
    <div class="doc-title">إيضاحات حول القوائم المالية — ${fiscalPeriodText(contract)}</div>
    ${entityInfoNote(contract)}
    ${generalPoliciesNote(framework, isTransition)}
    ${blocks}
    ${closing}
  </div>`;
}

module.exports = { notesSheet };
