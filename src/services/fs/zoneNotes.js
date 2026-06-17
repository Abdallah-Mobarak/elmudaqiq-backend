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

function breakdownNote(no, line, periodModels, np, extras) {
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
    <table class="mini"><tbody>${rows}${prov}<tr class="tot"><td class="col-caption">المجموع</td>${amtCols(tot, credit)}</tr></tbody></table></div>`;
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

function moveCostNote(no, line, periodModels) {
  // cost side + accumulated amort/dep side from the trial-balance movement columns of the line's detail.
  const det = svc.getLineDetail(periodModels[0], Number(line.code)) || [];
  const isAccum = (n) => /(مجمع|مجمّع).*(إهلاك|اهلاك|إطفاء|اطفاء)/.test(String(n || ""));
  const cost = det.filter((d) => !isAccum(d.accountName));
  const acc = det.filter((d) => isAccum(d.accountName));
  const sum = (arr, f) => arr.reduce((s, d) => s + f(d), 0);
  const cb = sum(cost, (d) => d.beginningDebit || 0), ca = sum(cost, (d) => d.debitMovement || 0), cd = sum(cost, (d) => d.creditMovement || 0);
  const ce = cb + ca - cd;
  const ab = sum(acc, (d) => d.beginningCredit || 0), ac = sum(acc, (d) => d.creditMovement || 0), ad = sum(acc, (d) => d.debitMovement || 0);
  const ae = ab + ac - ad;
  const row = (l, v) => `<tr><td class="col-caption">${esc(l)}</td><td class="amount">${money(v)}</td></tr>`;
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <table class="mini"><tbody>
      ${row("التكلفة أول المدة", cb)}${row("إضافات", ca)}${row("استبعادات", -cd)}<tr class="subtotal"><td class="col-caption">التكلفة آخر المدة</td><td class="amount">${money(ce)}</td></tr>
      ${row(`${esc(line.amortLabel || "مجمع الإطفاء")} أول المدة`, -ab)}${row("المحمّل خلال العام", -ac)}${row("استبعادات", ad)}<tr class="subtotal"><td class="col-caption">${esc(line.amortLabel || "مجمع الإطفاء")} آخر المدة</td><td class="amount">${money(-ae)}</td></tr>
      <tr class="grand-total"><td class="col-caption">صافي القيمة الدفترية</td><td class="amount">${money(ce - ae)}</td></tr>
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

function relatedNote(no, line, extras) {
  const rp = extras.relatedParties || [];
  const rows = rp.map((p) => `<tr><td class="col-caption">${esc(p.name)}</td><td class="amount">${money(p.v2024 || 0)}</td><td class="amount">${money(p.v2023 || 0)}</td></tr>`).join("");
  const t24 = rp.reduce((s, p) => s + (p.v2024 || 0), 0), t23 = rp.reduce((s, p) => s + (p.v2023 || 0), 0);
  return `<div class="note-block"><div class="note-title">${no}. ${esc(line.label)}</div>
    <div class="para">${esc(line.policyText)}</div>
    <table class="mini"><tbody>${rows}<tr class="tot"><td class="col-caption">المجموع</td><td class="amount">${money(t24)}</td><td class="amount">${money(t23)}</td></tr></tbody></table></div>`;
}

function lineNote(no, line, periodModels, extras, np) {
  switch (line.noteType) {
    case "PPE": return ppeNote(no, line, extras, np);
    case "MOVE_COST": return moveCostNote(no, line, periodModels);
    case "EMP_BEN": return empBenefitNote(no, line, extras);
    case "ZAKAT": return zakatNote(no, line, extras);
    case "LEASE": return leaseNote(no, line, periodModels, extras);
    case "CAPITAL": return capitalNote(no, line, extras);
    case "RELATED": return relatedNote(no, line, extras);
    case "PROVISION": return provisionNote(no, line, periodModels, extras);
    default: return breakdownNote(no, line, periodModels, np, extras);
  }
}

function notesSheet(contract, periodModels, extras, notes, terms, framework, isTransition) {
  const np = periodModels.length;
  const blocks = cat.LINES.filter((l) => notes[l.key]).sort((a, b) => notes[a.key] - notes[b.key]).map((l) => lineNote(notes[l.key], l, periodModels, extras, np)).join("");
  return `<div class="sheet">
    <div class="report-head"><div class="company">${esc(contract.customerName || "")}</div><div>${entityLine(contract)}</div></div>
    <div class="doc-title">إيضاحات حول القوائم المالية — ${fiscalPeriodText(contract)}</div>
    ${entityInfoNote(contract)}
    ${generalPoliciesNote(framework, isTransition)}
    ${blocks}
  </div>`;
}

module.exports = { notesSheet };
