/**
 * تجربة كاملة: يولّد (1) ملف الميزانية بنمط زون، و(2) ملف "تشريح" يمسك كل بند
 * في القوائم ويقول الرقم جه منين (حسابات الميزان المربوطة + المعادلة + الإشارة).
 *
 * Usage: node scripts/e2e-dissect.js [contractId]
 */
const svc = require("../src/services/financialStatements.service");
const { generateZoneReportHtml } = require("../src/services/fs/zoneReport");
const cat = require("../src/services/fs/zoneCatalog");
const exportPdfFromHtml = require("../src/utils/fileHandlers/exportPdfFromHtml");

const CID = process.argv[2] || "dae46abe-3c09-4640-9a6e-80ba7b453663";
const n = (x) => Math.round(x).toLocaleString("en-US");

const CREDIT_SECTIONS = ["CURRENT_LIAB", "NONCURRENT_LIAB", "EQUITY", "INC_REVENUE", "INC_OTHER"];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Aref+Ruqaa:wght@400;700&display=swap');
*{box-sizing:border-box} body{font-family:'Cairo',sans-serif;direction:rtl;color:#1f2937;margin:0;line-height:1.8}
.sheet{padding:30px 38px;page-break-after:always;position:relative;min-height:1040px}
.sheet:last-child{page-break-after:auto}
h1{font-size:28px;font-weight:800;color:#0f766e;margin:0 0 6px}
h2{font-size:20px;font-weight:800;color:#0f766e;border-bottom:3px solid #99f6e4;padding-bottom:8px;margin:0 0 14px}
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:980px}
.cover .badge{background:#0f766e;color:#fff;border-radius:999px;padding:6px 18px;font-weight:700;margin-bottom:22px}
.muted{color:#6b7280;font-size:13px}
.block{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:14px 0;background:#fafafa;page-break-inside:avoid}
.block .ttl{font-size:16px;font-weight:800;color:#0e7490}
.block .ttl .note{background:#0f766e;color:#fff;border-radius:6px;padding:1px 7px;font-size:12px;margin-inline-start:6px}
.block .face{font-size:14px;font-weight:700;margin:4px 0}
.hl{padding:0 4px;border-radius:3px;font-weight:800;background:#fde68a}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12.5px}
th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:right}
th{background:#e2e8f0;font-weight:700}
td.num,th.num{text-align:left;direction:ltr;font-variant-numeric:tabular-nums}
tr.sum td{background:#ecfeff;font-weight:800}
.formula{font-family:monospace;direction:ltr;text-align:left;background:#0f172a;color:#7dd3fc;padding:6px 9px;border-radius:6px;font-size:12px;margin-top:6px}
.note-h{font-family:'Aref Ruqaa',serif;font-size:15px;background:#fef9c3;box-shadow:2px 3px 7px rgba(0,0,0,.15);border-radius:4px;padding:9px 12px;margin-top:8px;position:relative}
.note-h .pin{position:absolute;top:-8px;right:16px;width:14px;height:14px;border-radius:50%;background:#ef4444}
.note-h b{color:#9a3412}
.foot{position:absolute;bottom:14px;right:38px;left:38px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:6px}
`;

function lineBlock(model, line, note, periodLabel) {
  const credit = CREDIT_SECTIONS.includes(line.section);
  const node = model.byAccountNumber.get(String(line.code));
  if (!node) return "";
  const display = credit ? -node.amount : node.amount;
  if (Math.abs(display) < 0.5) return "";
  const details = (svc.getLineDetail(model, String(line.code)) || []);

  const rows = details.map((d) => {
    const raw = Number(d.amount) || 0;
    const shown = credit ? -raw : raw;
    return `<tr><td>${d.accountCode} — ${d.accountName}</td><td class="num">${n(shown)}</td></tr>`;
  }).join("");

  const formula = details.length
    ? details.map((d) => n(credit ? -(Number(d.amount) || 0) : (Number(d.amount) || 0))).join(" + ").replace(/\+ -/g, "- ") + " = " + n(display)
    : n(display);

  const signNote = credit
    ? `هذا بند <b>دائن الطبيعة</b> (مطلوبات/حقوق/إيرادات)، مخزّن بإشارة سالبة في الميزان والنظام يعرضه موجباً في القائمة.`
    : `هذا بند <b>مدين الطبيعة</b> (أصول/مصروفات)، يظهر بإشارته الموجبة.`;

  return `<div class="block">
    <div class="ttl">${line.label} ${note ? `<span class="note">إيضاح ${note}</span>` : ""}</div>
    <div class="face">الظاهر في صلب القائمة (${periodLabel}): <span class="hl">${n(display)}</span></div>
    <table><thead><tr><th>حسابات الميزان المربوطة تحت هذا البند (مستوى 4)</th><th class="num">الرصيد</th></tr></thead>
    <tbody>${rows || `<tr><td class="muted">رصيد مباشر على التجميعة</td><td class="num">${n(display)}</td></tr>`}
    <tr class="sum"><td>المجموع المُرحّل إلى القائمة</td><td class="num">${n(display)}</td></tr></tbody></table>
    <div class="formula">${formula}</div>
    <div class="note-h"><span class="pin"></span>${signNote}</div>
  </div>`;
}

(async () => {
  // (أ) ملف الميزانية بنمط زون
  const reportHtml = await generateZoneReportHtml(CID, { opinionType: "UNQUALIFIED" });
  const rep = await exportPdfFromHtml({ html: reportHtml, filePrefix: "الميزانية_شركة_المثال" });

  // (ب) ملف التشريح
  const periodModels = await svc._loadModels(CID);
  const m = periodModels[0];
  const label = svc.defaultPeriodLabel(m);
  const contract = m.contract;

  // أعد ترقيم الإيضاحات بنفس منطق التقرير
  const notes = {};
  let nn = 6;
  for (const line of cat.LINES) {
    if (line.noteType === "NONE") continue;
    const credit = CREDIT_SECTIONS.includes(line.section);
    const node = m.byAccountNumber.get(String(line.code));
    const v = node ? (credit ? -node.amount : node.amount) : 0;
    if (Math.abs(v) < 0.5) continue;
    notes[line.key] = nn++;
  }

  const posLines = cat.LINES.filter((l) => ["CURRENT_ASSETS", "NONCURRENT_ASSETS", "CURRENT_LIAB", "NONCURRENT_LIAB", "EQUITY"].includes(l.section));
  const incLines = cat.LINES.filter((l) => String(l.section).startsWith("INC_"));

  const cover = `<div class="sheet cover">
    <div class="badge">ALMUDAQIQ — تشريح القوائم</div>
    <h1>كل رقم جه منين؟</h1>
    <p class="muted">${contract.customerName} — ${label}</p>
    <div class="note-h" style="max-width:460px;margin-top:20px"><span class="pin"></span>
      كل بند في القائمة = <b>مجموع أرصدة حسابات الميزان المربوطة تحته</b>. الصفحات الجاية تمسك كل بند وتفكّكه.</div>
  </div>`;

  const posSheet = `<div class="sheet"><h2>تشريح قائمة المركز المالي</h2>${posLines.map((l) => lineBlock(m, l, notes[l.key], label)).join("")}<div class="foot">تشريح — المركز المالي</div></div>`;
  const incSheet = `<div class="sheet"><h2>تشريح قائمة الدخل</h2>${incLines.map((l) => lineBlock(m, l, notes[l.key], label)).join("")}<div class="foot">تشريح — الدخل</div></div>`;

  const dissectHtml = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${cover}${posSheet}${incSheet}</body></html>`;
  const dis = await exportPdfFromHtml({ html: dissectHtml, filePrefix: "تشريح_الميزانية_شركة_المثال" });

  console.log("REPORT:", rep.filePath);
  console.log("DISSECTION:", dis.filePath);
  process.exit(0);
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
