/**
 * يولّد دليلاً تعليمياً بالعربي (PDF) يشرح إعداد القوائم المالية من الصفر:
 *  - الخريطة الكاملة (تسجيل الدخول → الـ PDF)
 *  - كل خطوة: تدخل إيه + يغذّي إيه + الـ endpoint
 *  - قوالب الإدخال (دليل حسابات / ميزان سنتين / مدخلات إضافية)
 *  - صفحة "ميزانية معلّقة" بستيكي نوتس وأسهم ملوّنة بخط اليد تشرح كل رقم
 *
 * Usage: node scripts/make-guide-pdf.js
 */
const exportPdfFromHtml = require("../src/utils/fileHandlers/exportPdfFromHtml");

// أرقام حقيقية من شركة الديمو (period 2024) — عشان التعليقات تكون مظبوطة.
const F = {
  cash: 500000, sandok: 120000, rajhi: 250000, jazira: 130000,
  recv: 300000, inv: 400000,
  ppeCost: 3000000, ppeDep: 1000000, ppeNet: 2000000,
  capital: 1000000, revenue: 5000000,
};
const n = (x) => x.toLocaleString("en-US");

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Aref+Ruqaa:wght@400;700&display=swap');
* { box-sizing: border-box; }
body { font-family: 'Cairo', sans-serif; direction: rtl; color: #1f2937; margin: 0; line-height: 1.9; }
.sheet { padding: 32px 40px; page-break-after: always; position: relative; min-height: 1040px; }
.sheet:last-child { page-break-after: auto; }
h1 { font-size: 30px; font-weight: 800; color: #0f766e; margin: 0 0 6px; }
h2 { font-size: 22px; font-weight: 800; color: #0f766e; border-bottom: 3px solid #99f6e4; padding-bottom: 8px; margin: 0 0 18px; }
h3 { font-size: 17px; font-weight: 700; color: #0e7490; margin: 18px 0 6px; }
p { margin: 6px 0; font-size: 14px; }
.muted { color: #6b7280; font-size: 13px; }
.tag { display:inline-block; background:#ecfeff; color:#0e7490; border:1px solid #a5f3fc; border-radius:6px; padding:2px 8px; font-size:12px; font-weight:700; }
.endpoint { font-family: monospace; direction: ltr; display:inline-block; background:#0f172a; color:#7dd3fc; padding:3px 8px; border-radius:6px; font-size:12px; }

/* غلاف */
.cover { display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; min-height:980px; }
.cover .badge { background:#0f766e; color:#fff; border-radius:999px; padding:6px 18px; font-weight:700; margin-bottom:24px; }
.cover h1 { font-size:40px; }
.cover .sub { font-size:18px; color:#475569; max-width:620px; }

/* صناديق التدفق */
.flow { display:flex; flex-direction:column; align-items:stretch; gap:0; max-width:560px; margin:10px auto; }
.fbox { border:2px solid #0d9488; border-radius:14px; padding:12px 16px; background:#f0fdfa; position:relative; }
.fbox .num { position:absolute; right:-14px; top:-14px; width:30px; height:30px; background:#0d9488; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; }
.fbox b { color:#0f766e; }
.farrow { text-align:center; color:#0d9488; font-size:26px; line-height:1; margin:4px 0; }

/* ستيكي نوت بخط اليد */
.note { font-family:'Aref Ruqaa', serif; font-size:16px; line-height:1.7; padding:14px 16px; border-radius:4px;
        box-shadow: 2px 4px 9px rgba(0,0,0,.18); position:relative; display:inline-block; max-width:340px; }
.note.y { background:#fef9c3; transform: rotate(-1.4deg); }
.note.p { background:#fbcfe8; transform: rotate(1.2deg); }
.note.b { background:#bae6fd; transform: rotate(-1deg); }
.note.g { background:#bbf7d0; transform: rotate(1.6deg); }
.note .pin { position:absolute; top:-9px; right:18px; width:16px; height:16px; border-radius:50%; background:#ef4444; box-shadow:0 2px 3px rgba(0,0,0,.3); }
.note b { color:#9a3412; }

/* تظليل القلم */
.hl { padding:0 3px; border-radius:3px; font-weight:700; }
.hl.y { background:#fde68a; } .hl.p { background:#fbcfe8; } .hl.g { background:#bbf7d0; } .hl.b { background:#bae6fd; }
.pen { color:#dc2626; font-weight:800; }

/* جداول */
table { width:100%; border-collapse:collapse; margin:10px 0; font-size:13px; }
th, td { border:1px solid #cbd5e1; padding:7px 9px; text-align:right; }
th { background:#0f766e; color:#fff; font-weight:700; }
td.num, th.num { text-align:left; direction:ltr; font-variant-numeric: tabular-nums; }
tr.head td { background:#e2e8f0; font-weight:800; }
.row-focus td { background:#fffbeb; }

/* صف معلّق: الجدول + نوت جنبه */
.annot { display:flex; gap:16px; align-items:flex-start; margin:14px 0; }
.annot .left { flex:1; }
.annot .right { width:340px; }
.bigarrow { color:#dc2626; font-size:30px; font-weight:800; }
.callout { display:flex; align-items:center; gap:8px; margin:10px 0; }

.steps li { margin:10px 0; font-size:14px; }
.kbox { border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; margin:12px 0; background:#fafafa; }
.kbox h3 { margin-top:0; }
.check li { margin:7px 0; font-size:14px; }
.foot { position:absolute; bottom:14px; right:40px; left:40px; text-align:center; color:#94a3b8; font-size:11px; border-top:1px solid #e2e8f0; padding-top:6px; }
`;

const head = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${CSS}</style></head><body>`;
const foot = (t) => `<div class="foot">${t}</div>`;

// ---------- الصفحات ----------
const cover = `
<div class="sheet cover">
  <div class="badge">ALMUDAQIQ — المدقق</div>
  <h1>كيف تُبنى القوائم المالية (الميزانية)؟</h1>
  <p class="sub">دليل عملي بالعربي — من تسجيل الدخول حتى ملف الـ PDF: تدخل إيه؟ الرقم جاي منين؟ وإيه اللازم للنظام عشان يطلّع ميزانية سليمة بسنتين مقارنة.</p>
  <br><br>
  <div class="note y" style="max-width:420px"><span class="pin"></span>
    القاعدة الذهبية:<br><b>الميزان = الأرقام</b> · <b>الدليل = الهيكل</b> · <b>الربط</b> هو اللي يوصّل كل رقم لمكانه في القائمة.
  </div>
</div>`;

const bigPicture = `
<div class="sheet">
  <h2>1) الصورة الكبيرة — الرحلة من الأول للآخر</h2>
  <p>كل القوائم بتتبني عبر "خط أنابيب" (pipeline) ثابت. مفيش رقم بيتكتب في القائمة يدوي — كله بيتولّد من المراحل دي بالترتيب:</p>
  <div class="flow">
    <div class="fbox"><span class="num">1</span><b>تسجيل الدخول</b> + اختيار المنشأة (العميل/العقد). <span class="muted">بيحدد إحنا بنشتغل على أنهي عقد.</span></div>
    <div class="farrow">↓</div>
    <div class="fbox"><span class="num">2</span><b>بيانات المنشأة</b> (عقد الارتباط): الاسم، الكيان القانوني، السنة المالية، الأرقام النظامية. <span class="muted">تتحط في الغلاف والتقرير.</span></div>
    <div class="farrow">↓</div>
    <div class="fbox"><span class="num">3</span><b>دليل الحسابات</b> (4 مستويات): الهيكل اللي بيرتّب ويصنّف. <span class="muted">القالب الثابت.</span></div>
    <div class="farrow">↓</div>
    <div class="fbox"><span class="num">4</span><b>رفع ميزان المراجعة</b> (Excel) لكل سنة: أرصدة حسابات العميل. <span class="muted">دي مصدر الأرقام.</span></div>
    <div class="farrow">↓</div>
    <div class="fbox"><span class="num">5</span><b>ربط الحسابات</b>: كل حساب في الميزان ← يتعيّن لحساب في الدليل. <span class="muted">أهم خطوة! بدونها الرقم = صفر.</span></div>
    <div class="farrow">↓</div>
    <div class="fbox"><span class="num">6</span><b>مدخلات أوراق العمل</b>: الزكاة، الاكتواري، استحقاق الإيجار، الحصص. <span class="muted">حاجات الميزان ميقدرش يطلّعها.</span></div>
    <div class="farrow">↓</div>
    <div class="fbox"><span class="num">7</span><b>توليد القوائم → PDF</b>: النظام يجمّع ويطلّع التقرير الكامل. <span class="muted">الناتج النهائي.</span></div>
  </div>
  <div class="callout" style="margin-top:18px">
    <div class="note p" style="max-width:480px"><span class="pin"></span>
      لو الميزان فاضي أو الحسابات <b>مش مربوطة</b> → القائمة هتطلع <b>صفر</b>. مش عطل في النظام، ده لأن مصدر الأرقام هو الميزان نفسه.
    </div>
  </div>
  ${foot("دليل إعداد القوائم المالية — المدقق")}
</div>`;

const steps = `
<div class="sheet">
  <h2>2) الخطوات بالتفصيل — تدخل إيه؟ ويغذّي إيه؟</h2>

  <div class="kbox"><h3>الخطوة 1 — تسجيل الدخول</h3>
    <p>بتدخل الإيميل والباسورد + هيدر المنشأة (subdomain). النظام يرجّع توكن تستخدمه في كل الطلبات.</p>
    <p><span class="tag">تدخل</span> إيميل · باسورد &nbsp; <span class="tag">endpoint</span> <span class="endpoint">POST /auth/login</span></p>
    <p><span class="tag">يغذّي</span> هوية المستخدم + المشترك (اللي منه بيانات توقيع المراجع: الاسم، الترخيص).</p>
  </div>

  <div class="kbox"><h3>الخطوة 2 — بيانات المنشأة (عقد الارتباط)</h3>
    <p>اسم المنشأة (كما بالسجل)، الكيان القانوني (شركاء/فردية/مساهمة)، الجنسية، السنة المالية، السجل التجاري، الرقم الضريبي/المميز/الموحّد، العنوان.</p>
    <p><span class="tag">يغذّي</span> الغلاف · الفهرس · ديباجة التقرير · مصطلح الحقوق (شركاء/ملكية/مساهمين) · إيضاح معلومات المنشأة.</p>
  </div>

  <div class="kbox"><h3>الخطوة 3 — دليل الحسابات (4 مستويات)</h3>
    <p>الهيكل: مستوى1 مجموعة (موجودات...) ← مستوى2 تصنيف (متداولة...) ← مستوى3 تجميعة (النقد...) ← مستوى4 حساب تفصيلي (الصندوق/البنك).</p>
    <p><span class="tag">يغذّي</span> ترتيب القائمة وتصنيفها. المستوى 3 يظهر في صلب القائمة، والمستوى 4 في الإيضاحات.</p>
  </div>

  <div class="kbox"><h3>الخطوة 4 — رفع ميزان المراجعة (لكل سنة) <span class="hl y">سنتين!</span></h3>
    <p>ترفع ملف Excel فيه لكل حساب: الرصيد الافتتاحي (مدين/دائن) + الحركة (مدين/دائن). النظام يحسب الرصيد الختامي (<b>finalBalance</b>) تلقائيًا.</p>
    <p><span class="tag">تدخل</span> ملف الميزان &nbsp; <span class="tag">endpoint</span> <span class="endpoint">POST /trial-balance/:contractId/upload</span></p>
    <p><span class="pen">مهم:</span> ترفع ميزان <b>للسنة الحالية + السنة السابقة</b> (وكلٌّ بحقل <b>period</b> مختلف) عشان القوائم تطلع <b>عمودين مقارنة</b>. وللتدفقات/الحقوق عمودين كمان: ميزان <b>افتتاحي</b> ثالث.</p>
  </div>

  <div class="kbox"><h3>الخطوة 5 — ربط الحسابات (Mapping) <span class="pen">⚠ أهم خطوة</span></h3>
    <p>كل حساب في الميزان تعيّنه لحساب في الدليل (<b>assignedAccountGuideId</b>). النظام <b>بيتجاهل أي حساب غير مربوط</b> — يعتبره صفر.</p>
    <p><span class="tag">يغذّي</span> الترحيل: رصيد الميزان يروح لمكانه في الدليل ويتجمّع في سطر القائمة.</p>
  </div>

  <div class="kbox"><h3>الخطوة 6 — مدخلات أوراق العمل (مش من الميزان)</h3>
    <p>الوعاء الزكوي · الفرضيات الاكتوارية لمنافع الموظفين + إعادة القياس · جدول استحقاق الإيجار · جدول حصص الشركاء · أسماء الأطراف ذات العلاقة.</p>
    <p><span class="tag">يغذّي</span> إيضاحات 16/17/20/21/22 — الحاجات اللي الميزان لوحده ميقدرش يحسبها.</p>
  </div>

  <div class="kbox"><h3>الخطوة 7 — توليد القوائم (PDF)</h3>
    <p>النظام يجمّع كل ده ويطلّع التقرير الكامل (غلاف + فهرس + تقرير المراجع + 4 قوائم + إيضاحات).</p>
    <p><span class="tag">endpoint</span> <span class="endpoint">GET /financial-statements/:contractId/full/pdf</span></p>
  </div>
  ${foot("دليل إعداد القوائم المالية — المدقق")}
</div>`;

const annotated = `
<div class="sheet">
  <h2>3) ميزانية معلّقة — كل رقم جاي منين؟</h2>
  <p class="muted">مثال حقيقي من شركة الديمو. التعليقات الصفراء/الزرقاء بتشرح مصدر كل رقم.</p>

  <div class="annot">
    <div class="left">
      <table>
        <tr class="head"><td>قائمة المركز المالي (مقتطف)</td><td class="num">2024</td></tr>
        <tr class="row-focus"><td>النقد وما في حكمه <span class="muted">(إيضاح 6)</span></td><td class="num"><span class="hl y">${n(F.cash)}</span></td></tr>
        <tr><td>ذمم مدينة تجارية</td><td class="num">${n(F.recv)}</td></tr>
        <tr><td>المخزون</td><td class="num">${n(F.inv)}</td></tr>
        <tr class="row-focus"><td>الممتلكات والآلات والمعدات</td><td class="num"><span class="hl g">${n(F.ppeNet)}</span></td></tr>
      </table>
    </div>
    <div class="right">
      <div class="note y"><span class="pin"></span>
        الرقم <b>${n(F.cash)}</b> مش متكتب يدوي ←<br>
        هو مجموع حسابات الميزان المربوطة تحت «النقد» (111):<br>
        الصندوق <b>${n(F.sandok)}</b> + الراجحي <b>${n(F.rajhi)}</b> + الجزيرة <b>${n(F.jazira)}</b> = <b>${n(F.cash)}</b>
      </div>
      <br>
      <div class="note g"><span class="pin"></span>
        الممتلكات <b>${n(F.ppeNet)}</b> = صافي ←<br>
        التكلفة <b>${n(F.ppeCost)}</b> (مدين +)<br>
        − مجمع الإهلاك <b>${n(F.ppeDep)}</b> (دائن −)<br>
        = <b>${n(F.ppeNet)}</b> صافي القيمة الدفترية
      </div>
    </div>
  </div>

  <div class="callout">
    <span class="bigarrow">↩</span>
    <div class="note b"><span class="pin"></span>
      الإشارة بتفرق! الأصول والمصروفات <b>موجبة (مدين)</b>، والمطلوبات/الحقوق/الإيرادات <b>سالبة (دائن)</b>.<br>
      عشان كده الإيرادات مخزّنة <b>−${n(F.revenue)}</b> ورأس المال <b>−${n(F.capital)}</b>، والنظام يعكس الإشارة ويعرضهم موجبين في القائمة.
    </div>
  </div>

  <div class="callout">
    <span class="bigarrow">↩</span>
    <div class="note p"><span class="pin"></span>
      المستوى 3 (مثل «النقد») يظهر في <b>وش القائمة</b> كسطر واحد.<br>
      المستوى 4 (الصندوق/البنوك) يظهر في <b>الإيضاح</b> بالتفصيل.
    </div>
  </div>
  ${foot("ميزانية معلّقة — مصدر الأرقام")}
</div>`;

const templates = `
<div class="sheet">
  <h2>4) قوالب اللي تضيفه (مع السنتين)</h2>

  <h3>أ) قالب دليل الحسابات (4 مستويات)</h3>
  <table>
    <tr class="head"><td>رقم الحساب</td><td>المستوى</td><td>الاسم</td><td>الأب</td></tr>
    <tr><td class="num">1</td><td>1</td><td>الموجودات</td><td>—</td></tr>
    <tr><td class="num">11</td><td>2</td><td>الموجودات المتداولة</td><td>1</td></tr>
    <tr><td class="num">111</td><td>3</td><td>النقد وما في حكمه</td><td>11</td></tr>
    <tr><td class="num">1111</td><td>4</td><td>الصندوق</td><td>111</td></tr>
    <tr><td class="num">1112</td><td>4</td><td>البنك</td><td>111</td></tr>
  </table>

  <h3>ب) قالب ميزان المراجعة — <span class="hl y">ملف لكل سنة</span></h3>
  <table>
    <tr class="head"><td>رقم الحساب</td><td>الاسم</td><td class="num">افتتاحي مدين</td><td class="num">افتتاحي دائن</td><td class="num">حركة مدين</td><td class="num">حركة دائن</td></tr>
    <tr><td class="num">1111</td><td>الصندوق</td><td class="num">100,000</td><td class="num">0</td><td class="num">20,000</td><td class="num">0</td></tr>
    <tr><td class="num">2111</td><td>موردون</td><td class="num">0</td><td class="num">150,000</td><td class="num">0</td><td class="num">50,000</td></tr>
  </table>
  <p class="muted">النظام يحسب الرصيد الختامي = الافتتاحي + الحركة. ترفع نفس الملف <b>للسنة الحالية والسنة السابقة</b> (وافتتاحية لو عايز تدفقات عمودين).</p>

  <h3>ج) قالب المدخلات الإضافية (أوراق العمل)</h3>
  <table>
    <tr class="head"><td>المدخل</td><td>محتواه</td><td>يغذّي</td></tr>
    <tr><td>الوعاء الزكوي</td><td>ربح معدّل + رأس مال + احتياطي − أصول ثابتة بالصافي</td><td>إيضاح 20-1</td></tr>
    <tr><td>الفرضيات الاكتوارية</td><td>معدل خصم · زيادة رواتب · دوران · إعادة قياس</td><td>إيضاح 21 + الدخل الشامل</td></tr>
    <tr><td>استحقاق الإيجار</td><td>أقل من سنة / 1–5 / أكثر من 5</td><td>إيضاح 17</td></tr>
    <tr><td>حصص الشركاء</td><td>الاسم · عدد الحصص · القيمة · النسبة</td><td>إيضاح 22</td></tr>
  </table>
  ${foot("قوالب الإدخال")}
</div>`;

const checklist = `
<div class="sheet">
  <h2>5) قائمة تحقّق سريعة قبل التوليد</h2>
  <ul class="check">
    <li>✅ بيانات المنشأة كاملة (اسم/كيان/سنة مالية/أرقام نظامية).</li>
    <li>✅ دليل الحسابات موجود (4 مستويات).</li>
    <li>✅ ميزان <b>السنة الحالية</b> مرفوع ومتوازن (مدين = دائن).</li>
    <li>✅ ميزان <b>السنة السابقة</b> مرفوع (عشان العمود المقارن).</li>
    <li>✅ <span class="pen">كل الحسابات مربوطة بالدليل</span> (مفيش حساب معلّق).</li>
    <li>✅ مدخلات أوراق العمل مدخلة (زكاة/اكتواري/إيجار/حصص) إن وُجدت.</li>
    <li>✅ الملاحظات/الرأي مسجّلة (لو فيه تحفظات).</li>
  </ul>

  <div class="note y" style="max-width:520px; margin-top:18px"><span class="pin"></span>
    لو القائمة طلعت <b>عمود واحد</b>: يبقى فيه ميزان سنة واحدة بس. ارفع ميزان السنة السابقة → تطلع عمودين تلقائيًا.<br><br>
    لو القائمة طلعت <b>صفر</b>: يبقى الميزان فاضي أو الحسابات مش مربوطة → راجع خطوة الربط (5).
  </div>

  <h3 style="margin-top:24px">الخلاصة</h3>
  <p><b>الميزان</b> يجيب الأرقام · <b>الدليل</b> يرتّبها · <b>الربط</b> يوصّلها · <b>أوراق العمل</b> تكمّل اللي الميزان ميقدرش يطلّعه · <b>النظام</b> يجمّع ويطلّع الـ PDF بسنتين مقارنة.</p>
  ${foot("قائمة التحقق والخلاصة")}
</div>`;

const html = head + cover + bigPicture + steps + annotated + templates + checklist + "</body></html>";

(async () => {
  const { filePath } = await exportPdfFromHtml({ html, filePrefix: "دليل_اعداد_القوائم_المالية" });
  console.log("PDF:", filePath);
  process.exit(0);
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
