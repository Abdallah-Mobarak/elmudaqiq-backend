/**
 * Renders the non-statement sections of the financial report (cover, index,
 * independent auditor's report, statement of changes in equity, cash flows,
 * and the notes) and assembles the FULL document into one printable HTML page-set.
 *
 * Statement bodies (position/income) come from renderStatementHtml.js.
 * Standardized texts (auditor report, accounting policies) are templates here and
 * will be replaced/extended by the client's standard wording (FRD 2.3.15).
 */
const {
  money,
  esc,
  entityLine,
  fiscalDateLabel,
  fiscalPeriodText,
  htmlDoc,
  positionBody,
  incomeBody,
} = require("./renderStatementHtml");
const { getLineDetail } = require("../../services/financialStatements.service");

/** Table C — dynamic entity terminology by legal entity (FRD 2.3.8). */
function entityTerms(legalEntity) {
  const le = String(legalEntity || "");
  if (/جمعية/.test(le)) return { word: "الجمعية", equityTitle: "قائمة حقوق المشتركين", equityWord: "حقوق المشتركين" };
  if (/مساهمة/.test(le)) return { word: "الشركة", equityTitle: "قائمة حقوق المساهمين", equityWord: "حقوق المساهمين" };
  if (/مسؤولية محدودة|محدوده/.test(le)) return { word: "الشركة", equityTitle: "قائمة التغير في حقوق الشركاء", equityWord: "حقوق الشركاء" };
  if (/شخص واحد|فردية|مؤسسة|مكتب/.test(le)) return { word: "المؤسسة", equityTitle: "قائمة التغير في حقوق الملكية", equityWord: "حقوق الملكية" };
  return { word: "المنشأة", equityTitle: "قائمة التغيرات في حقوق الملكية", equityWord: "حقوق الملكية" };
}

function fullName(contract) {
  const ent = entityLine(contract);
  return `${esc(contract.customerName || "")}${ent ? " " + ent : ""}`;
}

/** Attach the Arabic preposition "ل" correctly: لمؤسسة / للمعايير (ال → لل). */
function withLam(word) {
  const w = String(word || "");
  return w.startsWith("ال") ? "لل" + w.slice(2) : "ل" + w;
}

// ---------------------------------------------------------------------------
// Cover + Index
// ---------------------------------------------------------------------------
function coverBody(contract) {
  const c = contract || {};
  const place = [c.city, "المملكة العربية السعودية"].filter(Boolean).join(" – ");
  return `<div class="sheet"><div class="cover">
    <div class="c1">${esc(c.customerName || "")}</div>
    <div class="c2">${entityLine(c)}</div>
    <div class="c3">${esc(place)}</div>
    <div class="c4">القوائم المالية وتقرير مراجع الحسابات المستقل</div>
    <div class="c5">${fiscalPeriodText(c)}</div>
  </div></div>`;
}

function indexBody(contract, terms) {
  return `<div class="sheet">
    <div class="report-head"><div class="company">${esc(contract.customerName || "")}</div><div>${entityLine(contract)}</div></div>
    <div class="doc-title">فهرس القوائم المالية</div>
    <table class="index">
      <tr><td>تقرير مراجع الحسابات المستقل</td><td class="pg">2 – 4</td></tr>
      <tr><td>قائمة المركز المالي</td><td class="pg">5</td></tr>
      <tr><td>قائمة الدخل الشامل</td><td class="pg">6</td></tr>
      <tr><td>${esc(terms.equityTitle)}</td><td class="pg">7</td></tr>
      <tr><td>قائمة التدفقات النقدية</td><td class="pg">8</td></tr>
      <tr><td>إيضاحات حول القوائم المالية</td><td class="pg">9 وما بعدها</td></tr>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// Independent Auditor's Report
// ---------------------------------------------------------------------------
function opinionParagraph(type, name, dateLabel, equityWord, fw) {
  const L = withLam(name); // لمؤسسة / لشركة ...
  const F = withLam(fw); // للمعايير ... / لمعيار ...
  const head = `لقد راجعنا القوائم المالية ${L}، والتي تشمل قائمة المركز المالي كما في ${dateLabel}، وقائمة الدخل الشامل وقائمة التغيرات في ${equityWord} وقائمة التدفقات النقدية للسنة المنتهية في ذلك التاريخ، والإيضاحات المرفقة المتممة لها بما في ذلك ملخص للسياسات المحاسبية الهامة.`;
  const fair = `تعرض بصورة عادلة، من جميع النواحي الجوهرية، المركز المالي ${L} كما في ${dateLabel}، وأداءها المالي وتدفقاتها النقدية للسنة المنتهية في ذلك التاريخ، وفقاً ${F}`;
  if (type === "QUALIFIED")
    return `${head} وفي رأينا، باستثناء أثر الأمر أو الأمور المبينة في فقرة «أساس الرأي المتحفظ»، فإن القوائم المالية المرفقة ${fair}.`;
  if (type === "ADVERSE")
    return `${head} وفي رأينا، وبسبب أهمية الأمور المبينة في فقرة «أساس الرأي السلبي»، فإن القوائم المالية المرفقة لا تعرض بصورة عادلة، من جميع النواحي الجوهرية، المركز المالي ${L} كما في ${dateLabel}، ولا أداءها المالي ولا تدفقاتها النقدية للسنة المنتهية في ذلك التاريخ، وفقاً ${F}.`;
  if (type === "DISCLAIMER")
    return `لقد كُلّفنا بمراجعة القوائم المالية ${L} كما في ${dateLabel}. وبسبب أهمية الأمور المبينة في فقرة «أساس الامتناع عن إبداء الرأي»، لم نتمكن من الحصول على أدلة مراجعة كافية وملائمة لتوفير أساس لإبداء رأي، وبناءً عليه فإننا لا نبدي رأياً بشأن القوائم المالية المرفقة.`;
  // UNQUALIFIED
  return `${head} وفي رأينا، فإن القوائم المالية المرفقة ${fair}.`;
}

function basisParagraph(type) {
  if (type === "QUALIFIED" || type === "ADVERSE")
    return `كما هو موضح في الإيضاحات حول القوائم المالية. لقد قمنا بمراجعتنا وفقاً للمعايير الدولية للمراجعة المعتمدة في المملكة العربية السعودية، ونحن مستقلون عن المنشأة وفقاً لقواعد سلوك وآداب المهنة، ونعتقد أن أدلة المراجعة التي حصلنا عليها كافية ومناسبة لتوفير أساس لإبداء رأينا.`;
  if (type === "DISCLAIMER")
    return `كما هو موضح في الإيضاحات حول القوائم المالية، لم نتمكن من الحصول على أدلة مراجعة كافية وملائمة. ونحن مستقلون عن المنشأة وفقاً لقواعد سلوك وآداب المهنة المعتمدة في المملكة العربية السعودية.`;
  return `لقد قمنا بمراجعتنا وفقاً للمعايير الدولية للمراجعة المعتمدة في المملكة العربية السعودية. وتتمثل مسؤوليتنا بموجب تلك المعايير في قسم «مسؤوليات المراجع عن مراجعة القوائم المالية» الوارد في تقريرنا. ونحن مستقلون عن المنشأة وفقاً لقواعد سلوك وآداب المهنة المعتمدة في المملكة العربية السعودية، وقد التزمنا بالمتطلبات الأخلاقية الأخرى ذات الصلة. ونعتقد أن أدلة المراجعة التي حصلنا عليها كافية ومناسبة لتوفير أساس لإبداء رأينا.`;
}

const OPINION_TITLES = {
  UNQUALIFIED: "الرأي",
  QUALIFIED: "الرأي المتحفظ",
  ADVERSE: "الرأي السلبي",
  DISCLAIMER: "عدم إبداء الرأي",
};

function emphasisOfMatterBlock(emphasis) {
  if (!emphasis || !emphasis.text) return "";
  const ref = emphasis.note ? `الإيضاح رقم (${esc(emphasis.note)})` : "الإيضاح المرفق";
  return `<div class="sec-title">لفت الانتباه</div>
    <div class="para">نلفت الانتباه إلى ${ref} حول القوائم المالية، والذي يوضح أنه ${esc(emphasis.text)}. ولم يتم تعديل رأينا فيما يتعلق بهذا الأمر.</div>`;
}

function auditorReportBody(contract, { opinionType = "UNQUALIFIED", terms, framework, auditor = {}, emphasis = null }) {
  const name = fullName(contract);
  const dateLabel = fiscalDateLabel(contract);
  const a = {
    name: auditor.name || "................",
    office: auditor.office || "المكتب الرئيسي",
    preamble: auditor.preamble || "محاسبون ومراجعون قانونيون",
    license: auditor.license || "....",
    city: auditor.city || contract.city || "الرياض",
    hijriDate: auditor.hijriDate || "....../..../....هـ",
    gregorianDate: auditor.gregorianDate || "..../..../....م",
  };

  return `<div class="sheet">
    <div class="doc-title">تقرير مراجع الحسابات المستقل</div>
    <div class="para">إلى السادة / ${name} المحترمين</div>

    <div class="sec-title">${esc(OPINION_TITLES[opinionType] || "الرأي")}</div>
    <div class="para">${opinionParagraph(opinionType, name, dateLabel, terms.equityWord, framework)}</div>

    <div class="sec-title">أساس ${esc(OPINION_TITLES[opinionType] || "الرأي")}</div>
    <div class="para">${basisParagraph(opinionType)}</div>

    ${emphasisOfMatterBlock(emphasis)}

    <div class="sec-title">مسؤوليات الإدارة والمكلفين بالحوكمة عن القوائم المالية</div>
    <div class="para">تتحمل الإدارة مسؤولية إعداد القوائم المالية وعرضها بصورة عادلة وفقاً ${withLam(framework)}، وهي المسؤولة عن الرقابة الداخلية التي تراها الإدارة ضرورية لتمكينها من إعداد قوائم مالية خالية من أي تحريف جوهري سواء بسبب غش أو خطأ. وعند إعداد القوائم المالية، فإن الإدارة هي المسؤولة عن تقدير قدرة المنشأة على الاستمرار، والإفصاح بحسب مقتضى الحال عن الأمور ذات العلاقة بالاستمرارية. والمكلفون بالحوكمة هم المسؤولون عن الإشراف على عملية إعداد التقرير المالي للمنشأة.</div>

    <div class="sec-title">مسؤوليات المراجع عن مراجعة القوائم المالية</div>
    <div class="para">تتمثل أهدافنا في الوصول إلى تأكيد معقول عما إذا كانت القوائم المالية ككل خالية من تحريف جوهري سواء بسبب غش أو خطأ، وإصدار تقرير المراجع الذي يتضمن رأينا. إن التأكيد المعقول هو مستوى عالٍ من التأكيد، إلا أنه ليس ضماناً على أن المراجعة التي تم القيام بها وفقاً للمعايير الدولية للمراجعة المعتمدة في المملكة العربية السعودية ستكشف دائماً عن أي تحريف جوهري عند وجوده. وكجزء من المراجعة فإننا نمارس الحكم المهني ونحافظ على نزعة الشك المهني خلال المراجعة، كما نقوم بما يلي:</div>
    <div class="para">• تحديد وتقييم مخاطر التحريفات الجوهرية في القوائم المالية سواء بسبب غش أو خطأ، وتصميم وتنفيذ إجراءات مراجعة استجابةً لتلك المخاطر، والحصول على أدلة مراجعة كافية ومناسبة لتوفير أساس لإبداء رأينا.</div>
    <div class="para">• الحصول على فهم للرقابة الداخلية ذات الصلة بالمراجعة من أجل تصميم إجراءات مراجعة مناسبة للظروف، وليس بغرض إبداء رأي في فاعلية الرقابة الداخلية للمنشأة.</div>
    <div class="para">• تقويم مدى مناسبة السياسات المحاسبية المستخدمة ومدى معقولية التقديرات المحاسبية والإفصاحات ذات العلاقة التي قامت بها الإدارة.</div>
    <div class="para">• استنتاج مدى مناسبة استخدام الإدارة لأساس الاستمرارية المحاسبي، وما إذا كان هناك عدم تأكد جوهري متعلق بأحداث أو ظروف قد تثير شكاً كبيراً حول قدرة المنشأة على الاستمرار.</div>
    <div class="para">• تقويم العرض العام للقوائم المالية وهيكلها ومحتواها، بما في ذلك الإفصاحات، وما إذا كانت تمثل المعاملات والأحداث ذات العلاقة بطريقة تحقق العرض العادل.</div>

    <div class="sec-title">التقرير عن المتطلبات النظامية والتنظيمية الأخرى</div>
    <div class="para">${
      opinionType === "UNQUALIFIED"
        ? "وفي رأينا، فإن المنشأة قد التزمت من جميع النواحي الجوهرية بالأنظمة واللوائح المعمول بها في المملكة العربية السعودية فيما يتعلق بإعداد وعرض القوائم المالية."
        : "تم تناول المتطلبات النظامية والتنظيمية الأخرى وفقاً لنوع الرأي الموضح أعلاه."
    }</div>

    <div class="sign">
      <div>${esc(a.name)}</div>
      <div>${esc(a.office)} — ${esc(a.preamble)}</div>
      <div>ترخيص رقم ${esc(a.license)}</div>
      <div>${esc(a.city)} في: ${esc(a.hijriDate)} الموافق: ${esc(a.gregorianDate)}</div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Statement of Changes in Equity (basic — closing balances; movements need prior-year data)
// ---------------------------------------------------------------------------
const isRetainedEarnings = (name) => /(أرباح|مبقاة|محتجزة|خسائر متراكمة)/.test(String(name || ""));

function changesInEquityBody(contract, position, income, terms) {
  const equity = (position.sections || []).find((s) => s.key === "EQUITY");
  const lines = equity ? equity.groups.flatMap((g) => g.lines) : [];
  const np = (position.periods || []).length;
  const cur = (a) => (Array.isArray(a) ? a[0] : a) || 0;
  const prior = (a) => (Array.isArray(a) ? a[1] : 0) || 0;

  const header = `<div class="statement-header">
      <div class="company">${esc(contract.customerName || "")}</div>
      <div class="entity">${entityLine(contract)}</div>
      <div class="title">${esc(terms.equityTitle)}</div>
      <div class="date">${fiscalPeriodText(contract)}</div>
    </div>`;

  // Single period → closing balances only (movement needs comparative data).
  if (np < 2 || lines.length === 0) {
    const rows = lines
      .map((l) => `<tr class="line"><td class="col-caption">${esc(l.name)}</td><td class="amount">${money(cur(l.amounts))}</td></tr>`)
      .join("");
    const total = equity ? cur(equity.totals) : 0;
    return `<div class="sheet">${header}
      <table class="fs">
        <thead><tr><th class="caption col-caption">البيان</th><th class="col-amount">الرصيد كما في ${esc(fiscalDateLabel(contract))}</th></tr></thead>
        <tbody>${rows}<tr class="grand-total"><td class="col-caption">مجموع ${esc(terms.equityWord)}</td><td class="amount">${money(total)}</td></tr></tbody>
      </table>
      <div class="footnote">ملاحظة: تُعرض الأرصدة الختامية فقط؛ يُستكمل تحليل الحركة عند توفّر أرصدة السنة السابقة.</div>
    </div>`;
  }

  // Two periods → full movement: opening + net income − distributions (+ other) = closing.
  const netIncome = income && income.totals ? cur(income.totals.netResult) : 0;
  const comps = lines.map((l) => {
    const opening = prior(l.amounts);
    const closing = cur(l.amounts);
    const re = isRetainedEarnings(l.name);
    const inc = re ? netIncome : 0;
    const dist = re ? opening + inc - closing : 0; // balancing distributions/withdrawals
    const other = re ? 0 : closing - opening; // capital/reserve movements
    return { name: l.name, opening, inc, dist, other, closing };
  });

  const sum = (k) => comps.reduce((s, c) => s + c[k], 0);
  const headCells = comps.map((c) => `<th class="col-amount">${esc(c.name)}</th>`).join("") + `<th class="col-amount">المجموع</th>`;
  const rowCells = (vals, total) => comps.map((_, i) => `<td class="amount">${money(vals[i])}</td>`).join("") + `<td class="amount">${money(total)}</td>`;

  const rows = [];
  rows.push(`<tr class="line"><td class="col-caption">الرصيد في بداية السنة</td>${rowCells(comps.map((c) => c.opening), sum("opening"))}</tr>`);
  rows.push(`<tr class="line"><td class="col-caption">صافي دخل السنة</td>${rowCells(comps.map((c) => c.inc), sum("inc"))}</tr>`);
  if (comps.some((c) => Math.abs(c.dist) > 0.005))
    rows.push(`<tr class="line"><td class="col-caption">توزيعات / مسحوبات</td>${rowCells(comps.map((c) => -c.dist), -sum("dist"))}</tr>`);
  if (comps.some((c) => Math.abs(c.other) > 0.005))
    rows.push(`<tr class="line"><td class="col-caption">تغيرات أخرى</td>${rowCells(comps.map((c) => c.other), sum("other"))}</tr>`);
  rows.push(`<tr class="grand-total"><td class="col-caption">الرصيد في نهاية السنة</td>${rowCells(comps.map((c) => c.closing), sum("closing"))}</tr>`);

  return `<div class="sheet">${header}
    <table class="fs">
      <thead><tr><th class="caption col-caption">البيان</th>${headCells}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
    <div class="footnote">الإيضاحات المرفقة تعتبر جزءاً لا يتجزأ من القوائم المالية</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Statement of Cash Flows (structure — full movement analysis needs comparatives)
// ---------------------------------------------------------------------------
const isCashLine = (name) => /(نقد|صندوق|بنك|وما في حكم)/.test(String(name || ""));

function cashFlowsBody(contract, position, income, terms) {
  const np = (position.periods || []).length;
  const cur = (a) => (Array.isArray(a) ? a[0] : a) || 0;
  const prior = (a) => (Array.isArray(a) ? a[1] : 0) || 0;
  const netIncome = income && income.totals ? cur(income.totals.netResult) : 0;

  const header = `<div class="statement-header">
      <div class="company">${esc(contract.customerName || "")}</div>
      <div class="entity">${entityLine(contract)}</div>
      <div class="title">قائمة التدفقات النقدية</div>
      <div class="date">${fiscalPeriodText(contract)}</div>
    </div>`;

  // Single period → structure only (movement analysis needs comparatives).
  if (np < 2) {
    return `<div class="sheet">${header}
      <table class="fs"><tbody>
        <tr class="section-head"><td class="col-caption" colspan="2">التدفقات النقدية من الأنشطة التشغيلية</td></tr>
        <tr class="line"><td class="col-caption">صافي الدخل للسنة</td><td class="amount">${money(netIncome)}</td></tr>
        <tr class="section-head"><td class="col-caption" colspan="2">الأنشطة الاستثمارية</td></tr>
        <tr class="section-head"><td class="col-caption" colspan="2">الأنشطة التمويلية</td></tr>
      </tbody></table>
      <div class="footnote">ملاحظة: تُستكمل قائمة التدفقات النقدية عند توفّر أرصدة السنة السابقة (تحليل الحركة).</div>
    </div>`;
  }

  // Indirect method from the period-over-period deltas. Classify every balance
  // sheet line (except cash) into operating / investing / financing; the sum
  // reconciles to the change in cash by the accounting identity.
  const operating = [];
  const investing = [];
  const financing = [];
  let openingCash = 0;
  let closingCash = 0;
  let distributions = 0;

  const sectionByKey = Object.fromEntries((position.sections || []).map((s) => [s.key, s]));
  const walk = (sec, fn) => {
    if (!sec) return;
    for (const g of sec.groups || []) {
      const nonCurrent = /غير\s*متداول/.test(String(g.title || ""));
      for (const line of g.lines || []) fn(line, nonCurrent);
    }
  };

  // Assets: an increase USES cash (−Δ). Cash itself is the reconciliation target.
  walk(sectionByKey.ASSET, (line, nonCurrent) => {
    const d = cur(line.amounts) - prior(line.amounts);
    if (isCashLine(line.name)) {
      openingCash += prior(line.amounts);
      closingCash += cur(line.amounts);
      return;
    }
    const item = { label: `التغير في ${line.name}`, amount: -d };
    (nonCurrent ? investing : operating).push(item);
  });

  // Liabilities: an increase PROVIDES cash (+Δ). Non-current → financing.
  walk(sectionByKey.LIABILITY, (line, nonCurrent) => {
    const d = cur(line.amounts) - prior(line.amounts);
    (nonCurrent ? financing : operating).push({ label: `التغير في ${line.name}`, amount: d });
  });

  // Equity: capital changes → financing; retained earnings split into net income
  // (operating start) and distributions (financing).
  walk(sectionByKey.EQUITY, (line) => {
    const d = cur(line.amounts) - prior(line.amounts);
    if (isRetainedEarnings(line.name)) {
      distributions = netIncome - d; // closing = opening + netIncome − distributions
    } else {
      financing.push({ label: `التغير في ${line.name}`, amount: d });
    }
  });
  if (Math.abs(distributions) > 0.005) financing.push({ label: "توزيعات أرباح / مسحوبات", amount: -distributions });

  const sumItems = (arr) => arr.reduce((s, x) => s + x.amount, 0);
  const opTotal = netIncome + sumItems(operating);
  const invTotal = sumItems(investing);
  const finTotal = sumItems(financing);
  const netChange = opTotal + invTotal + finTotal;

  const lineRow = (label, amount, cls = "line") =>
    `<tr class="${cls}"><td class="col-caption">${esc(label)}</td><td class="amount">${money(amount)}</td></tr>`;
  const rows = [];
  rows.push(`<tr class="section-head"><td class="col-caption" colspan="2">التدفقات النقدية من الأنشطة التشغيلية</td></tr>`);
  rows.push(lineRow("صافي الدخل للسنة", netIncome));
  operating.forEach((x) => rows.push(lineRow(x.label, x.amount)));
  rows.push(lineRow("صافي النقد من الأنشطة التشغيلية", opTotal, "section-total"));
  rows.push(`<tr class="section-head"><td class="col-caption" colspan="2">التدفقات النقدية من الأنشطة الاستثمارية</td></tr>`);
  investing.forEach((x) => rows.push(lineRow(x.label, x.amount)));
  rows.push(lineRow("صافي النقد من الأنشطة الاستثمارية", invTotal, "section-total"));
  rows.push(`<tr class="section-head"><td class="col-caption" colspan="2">التدفقات النقدية من الأنشطة التمويلية</td></tr>`);
  financing.forEach((x) => rows.push(lineRow(x.label, x.amount)));
  rows.push(lineRow("صافي النقد من الأنشطة التمويلية", finTotal, "section-total"));
  rows.push(`<tr class="spacer"><td colspan="2"></td></tr>`);
  rows.push(lineRow("صافي التغير في النقد وما في حكمه", netChange, "subtotal"));
  rows.push(lineRow("النقد وما في حكمه في بداية السنة", openingCash));
  rows.push(lineRow("النقد وما في حكمه في نهاية السنة", openingCash + netChange, "grand-total"));

  const reconciles = Math.abs(openingCash + netChange - closingCash) < 0.5;
  const note = reconciles
    ? `<span class="balance-ok">✔ النقد آخر السنة مطابق لقائمة المركز المالي (${money(closingCash)})</span>`
    : `<span class="balance-fail">⚠ فرق في تسوية النقد: ${money(closingCash - (openingCash + netChange))}</span>`;

  return `<div class="sheet">${header}
    <table class="fs"><tbody>${rows.join("")}</tbody></table>
    <div class="footnote">${note}</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Notes & accounting policies
// ---------------------------------------------------------------------------
function entityInfoNoteBody(contract) {
  const c = contract || {};
  const row = (label, val) => (val ? `<tr><td class="col-caption">${esc(label)}</td><td>${esc(val)}</td></tr>` : "");
  return `<div class="note-block">
    <div class="note-title">1. تعريف المنشأة ونشاطها</div>
    <div class="para">تمارس ${esc(c.customerName || "المنشأة")} نشاطها في المملكة العربية السعودية.</div>
    <table class="mini">
      ${row("السجل التجاري", c.commercialRegisterNumber)}
      ${row("الرقم الضريبي", c.taxNumber)}
      ${row("الرقم الموحد", c.unifiedNumber)}
      ${row("العنوان", c.address)}
      ${row("الرمز البريدي", c.postalCode)}
      ${row("الجوال", c.contactPhone || c.whatsappPhone)}
      ${row("البريد الإلكتروني", c.email)}
    </table>
  </div>`;
}

function policiesNoteBody(framework) {
  const p = (t) => `<div class="para">${t}</div>`;
  return `<div class="note-block">
    <div class="note-title">2. أهم السياسات المحاسبية</div>
    ${p(`أساس الإعداد: أُعدّت هذه القوائم المالية وفقاً ${withLam(framework)}، وعلى أساس التكلفة التاريخية ومبدأ الاستحقاق وفرض الاستمرارية.`)}
    ${p(`العملة الوظيفية وعملة العرض: الريال السعودي هو العملة الوظيفية وعملة عرض القوائم المالية.`)}
    ${p(`الاعتراف بالإيرادات: يتم الاعتراف بالإيرادات عند تحويل السيطرة على السلع أو الخدمات إلى العملاء بالمبلغ الذي يعكس المقابل المتوقع استحقاقه.`)}
    ${p(`النقد وما في حكمه: يشمل النقد بالصندوق والأرصدة لدى البنوك والاستثمارات قصيرة الأجل عالية السيولة، ويُقاس بالقيمة الاسمية.`)}
    ${p(`الذمم المدينة التجارية: تُقاس بالتكلفة المطفأة بعد خصم مخصص الخسائر الائتمانية المتوقعة باستخدام المنهجية المبسطة.`)}
    ${p(`المخزون: يُقاس بالتكلفة أو صافي القيمة القابلة للتحقق أيهما أقل.`)}
    ${p(`الممتلكات والآلات والمعدات: تُقاس بالتكلفة التاريخية ناقصاً مجمع الإهلاك وأي خسائر انخفاض، ويُحتسب الإهلاك بطريقة القسط الثابت على مدى العمر الإنتاجي المقدر.`)}
    ${p(`الأصول غير الملموسة: تُقاس بالتكلفة ناقصاً مجمع الإطفاء وأي خسائر انخفاض، وتُطفأ على مدى عمرها الإنتاجي المقدر.`)}
    ${p(`التزامات منافع الموظفين المحددة: يتم قياسها وفق التقييم الاكتواري المعتمد (طريقة وحدة الائتمان المتوقعة).`)}
    ${p(`مخصص الزكاة: يُحتسب وفقاً لأنظمة هيئة الزكاة والضريبة والجمارك في المملكة العربية السعودية.`)}
  </div>`;
}

/** General notes 3–5: judgements & estimates, financial risk management, comparatives. */
function generalNotesBody() {
  const p = (t) => `<div class="para">${t}</div>`;
  return `
  <div class="note-block">
    <div class="note-title">3. الأهمية النسبية والأحكام والتقديرات المحاسبية</div>
    ${p(`يتطلب إعداد القوائم المالية استخدام الإدارة لأحكام وتقديرات تؤثر على مبالغ الأصول والالتزامات والإيرادات والمصروفات. وتستند هذه التقديرات إلى الخبرة السابقة والمعلومات المتاحة، وقد تختلف النتائج الفعلية عنها.`)}
  </div>
  <div class="note-block">
    <div class="note-title">4. إدارة المخاطر المالية</div>
    ${p(`تتعرض المنشأة لمخاطر مالية تشمل مخاطر السوق ومخاطر الائتمان ومخاطر السيولة، وتُدار هذه المخاطر من خلال سياسات وإجراءات معتمدة بهدف الحد من آثارها السلبية على المركز المالي ونتائج الأعمال.`)}
  </div>
  <div class="note-block">
    <div class="note-title">5. أساس المقارنة وأرقام المقارنة</div>
    ${p(`أُعيد تصنيف بعض أرقام المقارنة للسنة السابقة عند الضرورة لتتوافق مع عرض السنة الحالية، دون أثر على صافي حقوق الملكية أو نتائج الأعمال للسنة السابقة.`)}
  </div>`;
}

const isPPELine = (name) => /(ممتلكات|آلات|آالت|معدات|عقارات|أصول ثابتة)/.test(String(name || ""));
/** An accumulated-depreciation/amortization contra account (credit nature). */
const isAccumDep = (name) => /(مجمع|مجمّع).*(إهلاك|اهلاك|إطفاء|اطفاء)|إهلاك\s*متراكم|اهلاك\s*متراكم/.test(String(name || ""));

/**
 * Property, Plant & Equipment movement schedule (FRD Table H — full column set).
 * Cost side from the cost accounts; accumulated-depreciation side from the
 * matching contra accounts; both pulled from the trial-balance movement columns.
 */
function ppeMovementNote(line, detail) {
  const th = (t, w) => `<th style="border-bottom:1px solid #111;padding:3px 5px;font-size:10.5px"${w ? ` width="${w}"` : ""}>${esc(t)}</th>`;
  const cost = detail.filter((d) => !isAccumDep(d.accountName));
  const dep = detail.filter((d) => isAccumDep(d.accountName));

  // Cost side: opening debit + additions − disposals = cost at end.
  let cBeg = 0, cAdd = 0, cDisp = 0, cEnd = 0;
  const costRows = cost
    .map((d) => {
      const beg = d.beginningDebit || 0;
      const add = d.debitMovement || 0;
      const disp = d.creditMovement || 0;
      const end = beg + add - disp;
      cBeg += beg; cAdd += add; cDisp += disp; cEnd += end;
      return `<tr><td class="col-caption">${esc(d.accountName)}</td><td class="amount">${money(beg)}</td><td class="amount">${money(add)}</td><td class="amount">${money(-disp)}</td><td class="amount">${money(end)}</td></tr>`;
    })
    .join("");

  // Accumulated-depreciation side: opening credit + charge − disposals of dep.
  let dBeg = 0, dChg = 0, dDisp = 0, dEnd = 0;
  const depRows = dep
    .map((d) => {
      const beg = d.beginningCredit || 0;
      const chg = d.creditMovement || 0;
      const disp = d.debitMovement || 0;
      const end = beg + chg - disp;
      dBeg += beg; dChg += chg; dDisp += disp; dEnd += end;
      return `<tr><td class="col-caption">${esc(d.accountName)}</td><td class="amount">${money(beg)}</td><td class="amount">${money(chg)}</td><td class="amount">${money(-disp)}</td><td class="amount">${money(end)}</td></tr>`;
    })
    .join("");

  const nbv = cEnd - dEnd;
  const costHead = `<tr>${th("بيان التكلفة")}${th("أول المدة")}${th("إضافات")}${th("استبعادات")}${th("آخر المدة")}</tr>`;
  const depHead = `<tr>${th("مجمع الإهلاك")}${th("أول المدة")}${th("إهلاك السنة")}${th("استبعادات")}${th("آخر المدة")}</tr>`;

  const depSection = dep.length
    ? `<table class="mini" style="width:100%;margin-top:8px"><thead>${depHead}</thead><tbody>${depRows}
        <tr class="tot"><td class="col-caption">إجمالي مجمع الإهلاك</td><td class="amount">${money(dBeg)}</td><td class="amount">${money(dChg)}</td><td class="amount">${money(-dDisp)}</td><td class="amount">${money(dEnd)}</td></tr>
      </tbody></table>`
    : `<div class="footnote" style="text-align:right">لا توجد حسابات مجمع إهلاك مرتبطة بهذه الفئة؛ صافي القيمة الدفترية = التكلفة آخر المدة.</div>`;

  return `<div class="note-block">
    <div class="note-title">${line.note}. ${esc(line.name)}</div>
    <table class="mini" style="width:100%"><thead>${costHead}</thead><tbody>${costRows}
      <tr class="tot"><td class="col-caption">إجمالي التكلفة</td><td class="amount">${money(cBeg)}</td><td class="amount">${money(cAdd)}</td><td class="amount">${money(-cDisp)}</td><td class="amount">${money(cEnd)}</td></tr>
    </tbody></table>
    ${depSection}
    <table class="mini" style="width:100%;margin-top:8px"><tbody>
      <tr class="grand-total"><td class="col-caption">صافي القيمة الدفترية</td><td class="amount">${money(nbv)}</td></tr>
    </tbody></table>
  </div>`;
}

function breakdownNotesBody(model, statement) {
  const blocks = [];
  for (const sec of statement.sections || []) {
    for (const g of sec.groups || []) {
      for (const line of g.lines || []) {
        if (!line.note) continue;
        const detail = getLineDetail(model, line.accountNumber);
        if (!detail || detail.length === 0) continue;

        if (isPPELine(line.name)) {
          blocks.push(ppeMovementNote(line, detail));
          continue;
        }

        const rows = detail
          .map((d) => `<tr><td class="col-caption">${esc(d.accountName)}</td><td class="amount">${money(Math.abs(d.amount))}</td></tr>`)
          .join("");
        const total = detail.reduce((s, d) => s + Math.abs(d.amount), 0);
        blocks.push(`<div class="note-block">
          <div class="note-title">${line.note}. ${esc(line.name)}</div>
          <table class="mini">${rows}<tr class="tot"><td class="col-caption">المجموع</td><td class="amount">${money(total)}</td></tr></table>
        </div>`);
      }
    }
  }
  return blocks.join("");
}

function notesBody(contract, model, position, income, terms, framework) {
  return `<div class="sheet">
    <div class="report-head"><div class="company">${esc(contract.customerName || "")}</div><div>${entityLine(contract)}</div></div>
    <div class="doc-title">إيضاحات حول القوائم المالية — ${fiscalPeriodText(contract)}</div>
    ${entityInfoNoteBody(contract)}
    ${policiesNoteBody(framework)}
    ${generalNotesBody()}
    ${breakdownNotesBody(model, position)}
    ${breakdownNotesBody(model, income)}
  </div>`;
}

// ---------------------------------------------------------------------------
// Full document assembler
// ---------------------------------------------------------------------------
function renderFullReport({ contract, model, position, income, opinionType = "UNQUALIFIED", auditor = {}, framework, emphasis = null }) {
  const terms = entityTerms(contract.legalEntity);
  const fw = framework || "المعايير الدولية للتقارير المالية المعتمدة في المملكة العربية السعودية";
  return htmlDoc(
    coverBody(contract),
    indexBody(contract, terms),
    auditorReportBody(contract, { opinionType, terms, framework: fw, auditor, emphasis }),
    positionBody(position),
    incomeBody(income),
    changesInEquityBody(contract, position, income, terms),
    cashFlowsBody(contract, position, income, terms),
    notesBody(contract, model, position, income, terms, fw)
  );
}

module.exports = { renderFullReport, entityTerms };
