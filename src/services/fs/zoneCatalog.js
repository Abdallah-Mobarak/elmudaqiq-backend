/**
 * Canonical "Zone-parity" catalog (FRD 2.3 + BuildSpec_FSM_ZoneParity).
 *
 * The Zone Medical statements are the FIXED template; the only variable is the
 * numbers (pulled from each engagement's trial balance + supplementary inputs).
 * This module encodes, once:
 *   - the exact ORDER of statement lines (BuildSpec §3),
 *   - the note catalog: type + standard policy text per item (BuildSpec §4 + §7),
 *   - the numbering scheme (general policies, then statement lines by appearance).
 *
 * Standard account codes (STD.*) anchor the mapping so a seeded/standard chart
 * maps deterministically onto the template (no keyword guessing).
 *
 * Note TYPES:
 *   TEXT       — policy/definition paragraph
 *   BREAKDOWN  — Level-3 heading with its Level-4 detail beneath (+ optional provision sub-block)
 *   PPE        — Property, plant & equipment 10-column movement schedule (Note 12)
 *   MOVE_COST  — cost + accumulated amort/dep movement → net (intangibles 11, ROU 13)
 *   PROVISION  — opening/charge/used/closing movement
 *   EMP_BEN    — employee defined benefits: movement + actuarial assumptions + sensitivity (21)
 *   ZAKAT      — zakat base (20-1) + provision movement (20-2)
 *   LEASE      — lease maturity buckets + liability movement (17)
 *   CAPITAL    — capital + partners' share table (22)
 *   RELATED    — related parties / partner current accounts, shown BY NAME (16)
 */

// Standard chart anchor codes (Level-3 analytical groups).
const STD = {
  // Current assets
  CASH: "111",
  TRADE_RECEIVABLES: "112",
  INVENTORY: "113",
  PREPAID: "114",
  OTHER_RECEIVABLES: "115",
  // Non-current assets
  INTANGIBLES: "121",
  PPE: "122",
  ROU: "123",
  // Current liabilities
  TRADE_PAYABLES: "211",
  OTHER_PAYABLES: "212",
  RELATED_PARTIES: "213",
  LEASE_CURRENT: "214",
  ACCRUED: "215",
  NOTES_PAYABLE: "216",
  ZAKAT_PROVISION: "217",
  // Non-current liabilities
  LEASE_NONCURRENT: "221",
  EMPLOYEE_BENEFITS: "222",
  // Equity
  CAPITAL: "311",
  STATUTORY_RESERVE: "312",
  REMEASUREMENT_RESERVE: "313",
  RETAINED_EARNINGS: "314",
  // Income statement
  REVENUE: "411",
  COST_OF_REVENUE: "511",
  SELLING_EXPENSES: "611",
  GENERAL_ADMIN: "612",
  FINANCE_COSTS: "613",
  OTHER_INCOME: "711",
};

// --- General accounting policies (fixed numbers 1–5; BuildSpec §1.4-a) ---------
const GENERAL_POLICIES = [
  {
    key: "FIRST_TIME",
    title: "التطبيق لأول مرة للمعايير الدولية للتقارير المالية",
    text:
      "قامت المنشأة بإعداد قوائمها المالية وفقاً للمعايير الدولية للتقارير المالية الصادرة عن مجلس معايير المحاسبة الدولية، وذلك لأول مرة طبقاً لمتطلبات المعيار الدولي رقم (1) – التطبيق لأول مرة للمعايير الدولية للتقارير المالية. وقد تم الإفصاح عن تسويات حقوق الملكية ونتائج الأعمال الناتجة عن الانتقال من الإطار المحاسبي السابق ضمن الإيضاحات.",
    onlyTransition: true,
  },
  {
    key: "BASIS",
    title: "أساس الإعداد والالتزام والاستمرارية",
    text:
      "أُعدّت هذه القوائم المالية وفقاً {{FRAMEWORK}}، وعلى أساس التكلفة التاريخية ومبدأ الاستحقاق وفرض الاستمرارية، بما يتوافق مع الأنظمة واللوائح المحلية ذات العلاقة.",
  },
  {
    key: "CURRENCY",
    title: "العملة الوظيفية وعملة العرض",
    text:
      "الريال السعودي هو العملة الوظيفية وعملة عرض القوائم المالية، وتُحوّل المعاملات بالعملات الأجنبية بسعر الصرف في تاريخ المعاملة وفقاً لمعيار المحاسبة الدولي رقم (21).",
  },
  {
    key: "ZAKAT_POLICY",
    title: "مخصص الزكاة وضريبة الدخل",
    text:
      "تُحتسب الزكاة وفقاً لأنظمة هيئة الزكاة والضريبة والجمارك في المملكة العربية السعودية على أساس الوعاء الزكوي (الربح المعدّل أو الوعاء المحتسب أيهما أكبر)، ويُعترف بها كمصروف في قائمة الدخل.",
  },
  {
    key: "MATERIALITY",
    title: "الأهمية النسبية والأحكام والتقديرات المحاسبية",
    text:
      "يتطلب إعداد القوائم المالية استخدام الإدارة لأحكام وتقديرات تؤثر على مبالغ الأصول والالتزامات والإيرادات والمصروفات، وتشمل المجالات الرئيسية تقييم الخسائر الائتمانية المتوقعة والأعمار الإنتاجية للأصول وقياس التزامات منافع الموظفين.",
  },
];

// --- Statement line catalog (exact Zone order; BuildSpec §3) -------------------
// section keys group lines under headings on the face of the statement.
const SECTIONS = {
  CURRENT_ASSETS: { statement: "POSITION", title: "الموجودات المتداولة", group: "ASSETS", subtotal: "مجموع الموجودات المتداولة" },
  NONCURRENT_ASSETS: { statement: "POSITION", title: "الموجودات غير المتداولة", group: "ASSETS", subtotal: "مجموع الموجودات غير المتداولة" },
  CURRENT_LIAB: { statement: "POSITION", title: "المطلوبات المتداولة", group: "LIAB", subtotal: "مجموع المطلوبات المتداولة" },
  NONCURRENT_LIAB: { statement: "POSITION", title: "المطلوبات غير المتداولة", group: "LIAB", subtotal: "مجموع المطلوبات غير المتداولة" },
  EQUITY: { statement: "POSITION", title: "حقوق الملكية", group: "EQUITY", subtotal: "مجموع {{EQUITY_WORD}}" },
};

// Each line: { key, code, section, label, noteType, policyText, byName? }
const LINES = [
  // ---- Statement of Financial Position ----
  { key: "CASH", code: STD.CASH, section: "CURRENT_ASSETS", label: "النقد وما في حكمه", noteType: "BREAKDOWN",
    policyText: "يُقاس النقد وما في حكمه بالقيمة الاسمية، ويشمل النقد بالصندوق والأرصدة لدى البنوك والاستثمارات قصيرة الأجل عالية السيولة، وفق معيار المحاسبة الدولي رقم (7)." },
  { key: "TRADE_RECEIVABLES", code: STD.TRADE_RECEIVABLES, section: "CURRENT_ASSETS", label: "ذمم وأرصدة مدينة تجارية", noteType: "BREAKDOWN", provision: "مخصص ديون مشكوك في تحصيلها",
    policyText: "تُقاس الذمم المدينة التجارية بالتكلفة المطفأة بعد خصم مخصص الخسائر الائتمانية المتوقعة باستخدام المنهجية المبسطة، وفق المعيار الدولي للتقارير المالية رقم (9)." },
  { key: "INVENTORY", code: STD.INVENTORY, section: "CURRENT_ASSETS", label: "المخزون السلعي (البضاعة)", noteType: "BREAKDOWN", provision: "مخصص مخزون بضاعة راكدة",
    policyText: "يُقاس المخزون بالتكلفة أو صافي القيمة القابلة للتحقق أيهما أقل، وفق معيار المحاسبة الدولي رقم (2)." },
  { key: "PREPAID", code: STD.PREPAID, section: "CURRENT_ASSETS", label: "مصروفات مدفوعة مقدماً", noteType: "BREAKDOWN",
    policyText: "تمثل المصروفات المدفوعة مقدماً مبالغ تخص فترات لاحقة، وتُحمّل على المصروفات وفق مبدأ الاستحقاق، وفق معيار المحاسبة الدولي رقم (1)." },
  { key: "OTHER_RECEIVABLES", code: STD.OTHER_RECEIVABLES, section: "CURRENT_ASSETS", label: "ذمم مدينة أخرى", noteType: "BREAKDOWN",
    policyText: "تشمل الذمم المدينة الأخرى أرصدة بخلاف الذمم التجارية، وتُقاس بالتكلفة المطفأة، وفق المعيار الدولي للتقارير المالية رقم (9)." },
  { key: "INTANGIBLES", code: STD.INTANGIBLES, section: "NONCURRENT_ASSETS", label: "أصول غير ملموسة", noteType: "MOVE_COST", amortLabel: "مجمع الإطفاء",
    policyText: "تُقاس الأصول غير الملموسة بالتكلفة ناقصاً مجمع الإطفاء وأي خسائر انخفاض، وتُطفأ على مدى عمرها الإنتاجي المقدّر، وفق معيار المحاسبة الدولي رقم (38)." },
  { key: "PPE", code: STD.PPE, section: "NONCURRENT_ASSETS", label: "الممتلكات والآلات والمعدات", noteType: "PPE",
    policyText: "تُقاس الممتلكات والآلات والمعدات بالتكلفة التاريخية ناقصاً مجمع الإهلاك وأي خسائر انخفاض، ويُحتسب الإهلاك بطريقة القسط الثابت على مدى العمر الإنتاجي المقدّر، وفق معيار المحاسبة الدولي رقم (16)." },
  { key: "ROU", code: STD.ROU, section: "NONCURRENT_ASSETS", label: "أصول حق الاستخدام", noteType: "MOVE_COST", amortLabel: "مجمع الإهلاك",
    policyText: "تُقاس أصول حق الاستخدام بالتكلفة ناقصاً مجمع الإهلاك، وتُهلك على مدى مدة عقد الإيجار أو العمر الإنتاجي أيهما أقصر، وفق المعيار الدولي للتقارير المالية رقم (16)." },

  { key: "TRADE_PAYABLES", code: STD.TRADE_PAYABLES, section: "CURRENT_LIAB", label: "ذمم وأرصدة دائنة تجارية", noteType: "BREAKDOWN",
    policyText: "تُقاس الذمم الدائنة التجارية بالقيمة المستحقة السداد، وفق معيار المحاسبة الدولي رقم (1)." },
  { key: "OTHER_PAYABLES", code: STD.OTHER_PAYABLES, section: "CURRENT_LIAB", label: "ذمم وأرصدة دائنة أخرى", noteType: "BREAKDOWN",
    policyText: "تشمل الذمم الدائنة الأخرى الالتزامات قصيرة الأجل بخلاف التجارية، وتُقاس بالقيمة المستحقة السداد، وفق المعيار الدولي للتقارير المالية رقم (9)." },
  { key: "RELATED_PARTIES", code: STD.RELATED_PARTIES, section: "CURRENT_LIAB", label: "مطلوب لأطراف ذات علاقة", noteType: "RELATED", byName: true,
    policyText: "تمثل أرصدة الأطراف ذات العلاقة التزامات ناتجة عن معاملات في سياق النشاط الاعتيادي، ويُفصح عنها وفق معيار المحاسبة الدولي رقم (24)." },
  { key: "LEASE_CURRENT", code: STD.LEASE_CURRENT, section: "CURRENT_LIAB", label: "التزامات عقود إيجار متداولة", noteType: "LEASE",
    policyText: "تُقاس التزامات عقود الإيجار بالقيمة الحالية لمدفوعات الإيجار المستقبلية باستخدام معدل الخصم المناسب، وفق المعيار الدولي للتقارير المالية رقم (16)." },
  { key: "ACCRUED", code: STD.ACCRUED, section: "CURRENT_LIAB", label: "مصروفات مستحقة", noteType: "BREAKDOWN",
    policyText: "تمثل المصروفات المستحقة التزامات عن مصروفات تم تكبدها ولم تُسدد، وتُعترف وفق مبدأ الاستحقاق، وفق معيار المحاسبة الدولي رقم (1)." },
  { key: "NOTES_PAYABLE", code: STD.NOTES_PAYABLE, section: "CURRENT_LIAB", label: "أوراق دفع", noteType: "BREAKDOWN",
    policyText: "تمثل أوراق الدفع التزامات مالية قصيرة الأجل، وتُقاس بالقيمة الاسمية، وفق المعيار الدولي للتقارير المالية رقم (9)." },
  { key: "ZAKAT_PROVISION", code: STD.ZAKAT_PROVISION, section: "CURRENT_LIAB", label: "مخصص الزكاة", noteType: "ZAKAT",
    policyText: "" /* policy in general note 4 */ },
  { key: "LEASE_NONCURRENT", code: STD.LEASE_NONCURRENT, section: "NONCURRENT_LIAB", label: "التزامات عقود إيجار غير متداولة", noteType: "NONE" },
  { key: "EMPLOYEE_BENEFITS", code: STD.EMPLOYEE_BENEFITS, section: "NONCURRENT_LIAB", label: "التزامات منافع الموظفين المحددة", noteType: "EMP_BEN",
    policyText: "تُقاس التزامات منافع الموظفين المحددة باستخدام طريقة وحدة الائتمان المتوقعة وفق تقييم اكتواري، وتُعترف إعادة القياس ضمن الدخل الشامل الآخر، وفق معيار المحاسبة الدولي رقم (19)." },

  { key: "CAPITAL", code: STD.CAPITAL, section: "EQUITY", label: "رأس المال", noteType: "CAPITAL",
    policyText: "يمثل رأس المال قيمة المساهمات المقدمة من الملاك، ويُعترف به بالقيمة الاسمية وفق النظام الأساسي للمنشأة." },
  { key: "STATUTORY_RESERVE", code: STD.STATUTORY_RESERVE, section: "EQUITY", label: "الاحتياطي النظامي", noteType: "PROVISION",
    policyText: "يمثل الاحتياطي النظامي جزءاً من الأرباح يُقتطع وفق نظام الشركات والنظام الأساسي للمنشأة، وهو غير قابل للتوزيع إلا وفق الشروط النظامية." },
  { key: "REMEASUREMENT_RESERVE", code: STD.REMEASUREMENT_RESERVE, section: "EQUITY", label: "خسائر إعادة قياس التزامات منافع الموظفين", noteType: "NONE" },
  { key: "RETAINED_EARNINGS", code: STD.RETAINED_EARNINGS, section: "EQUITY", label: "الأرباح (الخسائر) المبقاة", noteType: "NONE" },

  // ---- Statement of Comprehensive Income (BuildSpec §3.2) ----
  { key: "REVENUE", code: STD.REVENUE, section: "INC_REVENUE", label: "الإيرادات", noteType: "BREAKDOWN",
    policyText: "يُعترف بالإيرادات عند تحويل السيطرة على السلع أو الخدمات إلى العملاء بالمبلغ الذي يعكس المقابل المتوقع، وفق المعيار الدولي للتقارير المالية رقم (15)." },
  { key: "COST_OF_REVENUE", code: STD.COST_OF_REVENUE, section: "INC_COST", label: "تكلفة الإيرادات", noteType: "BREAKDOWN", negative: true,
    policyText: "تمثل تكلفة الإيرادات التكاليف المرتبطة مباشرة بتحقيق الإيرادات، ويُعترف بها وفق مبدأ المقابلة، وفق معيار المحاسبة الدولي رقم (1)." },
  { key: "SELLING_EXPENSES", code: STD.SELLING_EXPENSES, section: "INC_OPEX", label: "مصروفات بيعية وتسويقية", noteType: "BREAKDOWN", negative: true,
    policyText: "تشمل مصروفات البيع والتسويق تكاليف الترويج والتوزيع، ويُعترف بها عند تكبدها وفق مبدأ الاستحقاق." },
  { key: "GENERAL_ADMIN", code: STD.GENERAL_ADMIN, section: "INC_OPEX", label: "مصروفات عمومية وإدارية", noteType: "BREAKDOWN", negative: true,
    policyText: "تشمل المصروفات العمومية والإدارية تكاليف إدارة وتشغيل المنشأة بخلاف تكاليف البيع والإنتاج، ويُعترف بها وفق مبدأ الاستحقاق." },
  { key: "FINANCE_COSTS", code: STD.FINANCE_COSTS, section: "INC_OPEX", label: "مصروفات تمويلية", noteType: "BREAKDOWN", negative: true,
    policyText: "تمثل المصروفات التمويلية فوائد التمويل بما فيها فائدة التزامات عقود الإيجار باستخدام طريقة سعر الفائدة الفعلي، وفق المعيار الدولي للتقارير المالية رقم (16)." },
  { key: "OTHER_INCOME", code: STD.OTHER_INCOME, section: "INC_OTHER", label: "إيرادات أخرى", noteType: "BREAKDOWN",
    policyText: "تمثل الإيرادات الأخرى الدخل المتحقق من أنشطة غير رئيسية، ويُعترف بها وفق مبدأ الاستحقاق." },
];

const byKey = Object.fromEntries(LINES.map((l) => [l.key, l]));
const byCode = Object.fromEntries(LINES.map((l) => [l.code, l]));

module.exports = { STD, GENERAL_POLICIES, SECTIONS, LINES, byKey, byCode };
