/**
 * Seed a FULL Zone-parity company: standard chart (mapped to zoneCatalog codes),
 * a balanced two-period trial balance, and the supplementary inputs (extras) the
 * trial balance can't provide (zakat base, actuarial, lease maturity, shares,
 * related parties, PPE classes). Run after seed; produces Zone-like coverage.
 *
 * Usage: node scripts/seed-zone-company.js [contractId]
 */
const prisma = require("../src/config/prisma");
const { setExtras } = require("../src/services/fs/fsExtras");

const CONTRACT_ID = process.argv[2] || "dae46abe-3c09-4640-9a6e-80ba7b453663";

// 4-level standard chart: [accountNumber, level, name]. Level-3 codes match STD.*
const CHART = [
  [1, "1", "الموجودات"],
  [11, "2", "الموجودات المتداولة"],
  [111, "3", "النقد وما في حكمه"], [1111, "4", "الصندوق الرئيسي"], [1112, "4", "بنك الراجحي"], [1113, "4", "بنك الجزيرة"],
  [112, "3", "ذمم وأرصدة مدينة تجارية"], [1121, "4", "عملاء تجاريون"], [1122, "4", "مخصص ديون مشكوك في تحصيلها"],
  [113, "3", "المخزون السلعي (البضاعة)"], [1131, "4", "بضاعة بغرض التشغيل"],
  [114, "3", "مصروفات مدفوعة مقدماً"], [1141, "4", "إيجار مقدم"], [1142, "4", "تأمين طبي مقدم"],
  [115, "3", "ذمم مدينة أخرى"], [1151, "4", "ذمم وعهد موظفين"], [1152, "4", "ضريبة قيمة مضافة مدينة"],
  [12, "2", "الموجودات غير المتداولة"],
  [121, "3", "أصول غير ملموسة"], [1211, "4", "برامج محاسبية"], [1212, "4", "مجمع إطفاء أصول غير ملموسة"],
  [122, "3", "الممتلكات والآلات والمعدات"], [1221, "4", "تكلفة الممتلكات والآلات والمعدات"], [1222, "4", "مجمع إهلاك الممتلكات والآلات والمعدات"],
  [123, "3", "أصول حق الاستخدام"], [1231, "4", "تكلفة أصول حق الاستخدام"], [1232, "4", "مجمع إهلاك أصول حق الاستخدام"],
  [2, "1", "المطلوبات"],
  [21, "2", "المطلوبات المتداولة"],
  [211, "3", "ذمم وأرصدة دائنة تجارية"], [2111, "4", "موردون تجاريون"],
  [212, "3", "ذمم وأرصدة دائنة أخرى"], [2121, "4", "تأمينات اجتماعية مستحقة"], [2122, "4", "دفعات مقدمة عملاء"],
  [213, "3", "مطلوب لأطراف ذات علاقة"], [2131, "4", "جاري الشركاء"],
  [214, "3", "التزامات عقود إيجار متداولة"], [2141, "4", "الجزء المتداول من التزام الإيجار"],
  [215, "3", "مصروفات مستحقة"], [2151, "4", "رواتب مستحقة"], [2152, "4", "أتعاب تدقيق مستحقة"],
  [216, "3", "أوراق دفع"], [2161, "4", "شيكات صادرة لم تقدم"],
  [217, "3", "مخصص الزكاة"], [2171, "4", "مخصص الزكاة الشرعية"],
  [22, "2", "المطلوبات غير المتداولة"],
  [221, "3", "التزامات عقود إيجار غير متداولة"], [2211, "4", "الجزء غير المتداول من التزام الإيجار"],
  [222, "3", "التزامات منافع الموظفين المحددة"], [2221, "4", "مخصص مكافأة نهاية الخدمة"],
  [3, "1", "حقوق الملكية"],
  [31, "2", "رأس المال والاحتياطيات"],
  [311, "3", "رأس المال"], [3111, "4", "رأس المال"],
  [312, "3", "الاحتياطي النظامي"], [3121, "4", "الاحتياطي النظامي"],
  [313, "3", "خسائر إعادة قياس التزامات منافع الموظفين"], [3131, "4", "خسائر إعادة القياس"],
  [314, "3", "الأرباح (الخسائر) المبقاة"], [3141, "4", "الأرباح المبقاة"],
  [4, "1", "الإيرادات"],
  [41, "2", "إيرادات النشاط"], [411, "3", "الإيرادات"], [4111, "4", "إيرادات نشاط"], [4112, "4", "مردودات المبيعات"], [4113, "4", "الخصم على المبيعات"],
  [5, "1", "تكلفة الإيرادات"],
  [51, "2", "تكلفة النشاط"], [511, "3", "تكلفة الإيرادات"], [5111, "4", "تكلفة المبيعات"], [5112, "4", "نسب وعمولات أطباء"],
  [6, "1", "المصروفات التشغيلية"],
  [61, "2", "مصروفات بيعية"], [611, "3", "مصروفات بيعية وتسويقية"], [6111, "4", "رواتب تسويق"], [6112, "4", "دعاية وإعلان"],
  [62, "2", "مصروفات إدارية"], [612, "3", "مصروفات عمومية وإدارية"], [6121, "4", "رواتب إدارية"], [6122, "4", "إهلاك أصول ثابتة"], [6123, "4", "أتعاب ورسوم"],
  [63, "2", "مصروفات تمويلية"], [613, "3", "مصروفات تمويلية"], [6131, "4", "فوائد عقود الإيجار"],
  [7, "1", "إيرادات أخرى"],
  [71, "2", "إيرادات أخرى"], [711, "3", "إيرادات أخرى"], [7111, "4", "دخل أنشطة غير رئيسية"],
];

// TB rows: [code, name, finalBalance2024, finalBalance2023, guideNum, {mv2024},{mv2023}]
// signs: assets/expenses +, liab/equity/revenue -, contra (allowance/accum) negative for assets side.
const TB = [
  ["1111", "الصندوق الرئيسي", 120000, 90000, 1111],
  ["1112", "بنك الراجحي", 250000, 180000, 1112],
  ["1113", "بنك الجزيرة", 130000, 95000, 1113],
  ["1121", "عملاء تجاريون", 320000, 250000, 1121],
  ["1122", "مخصص ديون مشكوك في تحصيلها", -20000, -15000, 1122],
  ["1131", "بضاعة بغرض التشغيل", 400000, 300000, 1131],
  ["1141", "إيجار مقدم", 30000, 25000, 1141],
  ["1142", "تأمين طبي مقدم", 20000, 18000, 1142],
  ["1151", "ذمم وعهد موظفين", 30000, 22000, 1151],
  ["1152", "ضريبة قيمة مضافة مدينة", 50000, 40000, 1152],
  ["1211", "برامج محاسبية", 100000, 80000, 1211, { beginningDebit: 80000, debitMovement: 20000, creditMovement: 0 }, { beginningDebit: 70000, debitMovement: 10000, creditMovement: 0 }],
  ["1212", "مجمع إطفاء أصول غير ملموسة", -40000, -25000, 1212, { beginningCredit: 25000, creditMovement: 15000, debitMovement: 0 }, { beginningCredit: 15000, creditMovement: 10000, debitMovement: 0 }],
  ["1221", "تكلفة الممتلكات والآلات والمعدات", 3000000, 2600000, 1221, { beginningDebit: 2600000, debitMovement: 500000, creditMovement: 100000 }, { beginningDebit: 2200000, debitMovement: 400000, creditMovement: 0 }],
  ["1222", "مجمع إهلاك الممتلكات والآلات والمعدات", -1000000, -750000, 1222, { beginningCredit: 750000, creditMovement: 300000, debitMovement: 50000 }, { beginningCredit: 520000, creditMovement: 230000, debitMovement: 0 }],
  ["1231", "تكلفة أصول حق الاستخدام", 1200000, 1200000, 1231, { beginningDebit: 1200000, debitMovement: 0, creditMovement: 0 }, { beginningDebit: 0, debitMovement: 1200000, creditMovement: 0 }],
  ["1232", "مجمع إهلاك أصول حق الاستخدام", -300000, -150000, 1232, { beginningCredit: 150000, creditMovement: 150000, debitMovement: 0 }, { beginningCredit: 0, creditMovement: 150000, debitMovement: 0 }],
  ["2111", "موردون تجاريون", -250000, -210000, 2111],
  ["2121", "تأمينات اجتماعية مستحقة", -40000, -30000, 2121],
  ["2122", "دفعات مقدمة عملاء", -50000, -35000, 2122],
  ["2131", "جاري الشركاء", -400000, -520000, 2131],
  ["2141", "الجزء المتداول من التزام الإيجار", -150000, -140000, 2141],
  ["2151", "رواتب مستحقة", -70000, -55000, 2151],
  ["2152", "أتعاب تدقيق مستحقة", -50000, -40000, 2152],
  ["2161", "شيكات صادرة لم تقدم", -60000, -45000, 2161],
  ["2171", "مخصص الزكاة الشرعية", -80000, -60000, 2171],
  ["2211", "الجزء غير المتداول من التزام الإيجار", -800000, -950000, 2211],
  ["2221", "مخصص مكافأة نهاية الخدمة", -340000, -180000, 2221],
  ["3111", "رأس المال", -1000000, -1000000, 3111],
  ["3121", "الاحتياطي النظامي", -200000, -120000, 3121],
  ["3131", "خسائر إعادة القياس", 50000, 0, 3131],
  ["3141", "الأرباح المبقاة", -850000, -469000, 3141],
  ["4111", "إيرادات نشاط", -5400000, -4000000, 4111],
  ["4112", "مردودات المبيعات", 250000, 180000, 4112],
  ["4113", "الخصم على المبيعات", 150000, 120000, 4113],
  ["5111", "تكلفة المبيعات", 2400000, 1900000, 5111],
  ["5112", "نسب وعمولات أطباء", 600000, 450000, 5112],
  ["6111", "رواتب تسويق", 250000, 200000, 6111],
  ["6112", "دعاية وإعلان", 150000, 110000, 6112],
  ["6121", "رواتب إدارية", 400000, 330000, 6121],
  ["6122", "إهلاك أصول ثابتة", 200000, 180000, 6122],
  ["6123", "أتعاب ورسوم", 100000, 90000, 6123],
  ["6131", "فوائد عقود الإيجار", 100000, 110000, 6131],
  ["7111", "دخل أنشطة غير رئيسية", -50000, -40000, 7111],
];

// Supplementary inputs (BuildSpec §5) — the figures a trial balance can't carry.
const EXTRAS = {
  framework: "IFRS", // full IFRS (Zone)
  transition: false,
  ppeClasses: [
    { name: "أجهزة كهربائية وحاسبات", rate: "20%", costBeg: 1028944, additions: 629395, disposals: 0, depBeg: 317320, depCharge: 328686, depDisposals: 0 },
    { name: "تجهيزات وتحسينات وديكورات", rate: "11%", costBeg: 1100000, additions: 0, disposals: 0, depBeg: 250000, depCharge: 121314, depDisposals: 0 },
    { name: "عدد ومعدات", rate: "6%", costBeg: 471056, additions: 0, disposals: 100000, depBeg: 182680, depCharge: 50000, depDisposals: 50000 },
  ],
  zakat: {
    adjustedProfit: 850000,
    employeeBenefitsCharge: 169815,
    capital: 1000000,
    statutoryReserve: 200000,
    partnersBalance: 400000,
    retainedEarnings: 469000,
    netFixedAssets: -2000000,
    base: 1138815,
    rate: "2.5%",
    due: 80000,
  },
  employeeBenefits: {
    assumptions: { discountRate: "3.40%", salaryGrowth: "6.00%", turnover: "23%", retirementAge: "60 سنة", employees: 103 },
    sensitivity: { discountRate: 23670, salaryGrowth: 15780, turnover: 3945 },
    serviceCost: 169815,
    interestCost: 4541,
    remeasurement: 50000,
    paid: 64356,
  },
  leaseMaturity: { lessThanYear: 150000, oneToFive: 600000, moreThanFive: 200000 },
  shares: {
    capital: 1000000,
    shareValue: 10,
    totalShares: 100000,
    partners: [
      { name: "د. سعيد محمد الشهري", shares: 16666, pct: "16.66%" },
      { name: "د. أسامة محمد الخزيم", shares: 16666, pct: "16.66%" },
      { name: "د. عمرو محمد عبد الجبار", shares: 16670, pct: "16.67%" },
      { name: "د. صالح طلال المطيري", shares: 16666, pct: "16.66%" },
      { name: "د. عبد العزيز نزار مدني", shares: 16666, pct: "16.66%" },
      { name: "د. محمد عطاء المشعلي", shares: 16666, pct: "16.66%" },
    ],
  },
  relatedParties: [
    { name: "جاري الشريك د. سعيد الشهري", v2024: 120000, v2023: 160000 },
    { name: "جاري الشريك د. أسامة الخزيم", v2024: 100000, v2023: 140000 },
    { name: "جاري الشريك د. عمرو عبد الجبار", v2024: 90000, v2023: 120000 },
    { name: "جاري الشريك د. صالح المطيري", v2024: 90000, v2023: 100000 },
  ],
  provisions: {
    "1122": { begin: 15000, charge: 5000, used: 0 }, // doubtful debts
    "312": { begin: 120000, charge: 80000, used: 0 }, // statutory reserve transfer
  },
};

// Deep-scale numeric values by a factor (keeps the trial balance balanced and
// the extras consistent, since everything scales linearly).
function scaleVal(v, k) { return typeof v === "number" ? Math.round(v * k) : v; }
function scaleExtras(obj, k) {
  if (Array.isArray(obj)) return obj.map((x) => scaleExtras(x, k));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [key, val] of Object.entries(obj)) {
      // keep rates/percent/labels/flags as-is
      if (["rate", "framework", "transition", "name", "pct", "discountRate", "salaryGrowth", "turnover", "retirementAge", "employees", "shareValue"].includes(key)) out[key] = val;
      else out[key] = typeof val === "number" ? scaleVal(val, k) : scaleExtras(val, k);
    }
    return out;
  }
  return obj;
}

const PROFILES = {
  "dae46abe-3c09-4640-9a6e-80ba7b453663": { name: "شركة المثال الطبية", legalEntity: "شركة ذات مسؤولية محدودة", nationality: "سعودية", scale: 1, framework: "IFRS", transition: false, cr: "1010688081", tax: "310868951000003", unified: "7021554345" },
  "59625976-ca29-4110-b633-e7202e131801": { name: "مؤسسة فاليو التجارية", legalEntity: "مؤسسة فردية", nationality: "سعودية", scale: 0.5, framework: "SME", transition: false, cr: "1010555221", tax: "300055522100003", unified: "7005552210" },
  "5fc3e650-f110-438e-85c0-cfcadeff54fa": { name: "شركة الحمد الصناعية", legalEntity: "شركة مساهمة مغلقة", nationality: "سعودية", scale: 2, framework: "IFRS", transition: false, cr: "1010777443", tax: "300077744300003", unified: "7007774430" },
};

async function seedCompany(contractId) {
  const profile = PROFILES[contractId] || PROFILES["dae46abe-3c09-4640-9a6e-80ba7b453663"];
  const k = profile.scale;
  const contract = await prisma.engagementContract.findUnique({
    where: { id: contractId },
    select: { id: true, subscriberId: true },
  });
  if (!contract) throw new Error("Contract not found: " + contractId);
  const subscriberId = contract.subscriberId;
  const CONTRACT_ID = contractId;

  // 1) chart
  const existing = await prisma.accountGuide.findMany({
    where: { subscriberId, accountNumber: { in: CHART.map((c) => c[0]) } },
    select: { accountNumber: true },
  });
  const have = new Set(existing.map((e) => e.accountNumber));
  const toCreate = CHART.filter((c) => !have.has(c[0])).map(([accountNumber, level, accountName]) => ({ subscriberId, accountNumber, level, accountName }));
  if (toCreate.length) await prisma.accountGuide.createMany({ data: toCreate });
  const guides = await prisma.accountGuide.findMany({ where: { subscriberId, accountNumber: { in: CHART.map((c) => c[0]) } }, select: { id: true, accountNumber: true } });
  const guideByNum = new Map(guides.map((g) => [g.accountNumber, g.id]));

  // 2) entity fields
  await prisma.engagementContract.update({
    where: { id: CONTRACT_ID },
    data: {
      customerName: profile.name,
      legalEntity: profile.legalEntity,
      nationality: profile.nationality,
      fiscalYearStart: new Date("2024-01-01"),
      fiscalYearEnd: new Date("2024-12-31"),
      commercialRegisterNumber: profile.cr,
      taxNumber: profile.tax,
      unifiedNumber: profile.unified,
      address: "الرياض - حي الياسمين",
      email: "info@example-medical.sa",
      postalCode: "13326",
      region: "الرياض",
      contactPhone: "0594899148",
    },
  });

  // 3) two periods
  await prisma.trialBalance.deleteMany({ where: { contractId: CONTRACT_ID } });
  const uploaderId = (await prisma.user.findFirst({ where: { subscriberId }, select: { id: true } }) || await prisma.user.findFirst({ select: { id: true } })).id;
  for (const period of ["2024", "2023"]) {
    const tb = await prisma.trialBalance.create({ data: { contractId: CONTRACT_ID, period, status: "CONFIRMED", uploadedById: uploaderId }, select: { id: true } });
    const idx = period === "2024" ? 0 : 1;
    const rows = TB.map(([accountCode, accountName, fb24, fb23, num, mv24, mv23]) => {
      const mv = (idx === 0 ? mv24 : mv23) || {};
      return {
        trialBalanceId: tb.id, accountCode, accountName,
        finalBalance: scaleVal(idx === 0 ? fb24 : fb23, k),
        assignedAccountGuideId: guideByNum.get(num) || null,
        beginningDebit: scaleVal(mv.beginningDebit || 0, k), beginningCredit: scaleVal(mv.beginningCredit || 0, k),
        debitMovement: scaleVal(mv.debitMovement || 0, k), creditMovement: scaleVal(mv.creditMovement || 0, k),
      };
    });
    await prisma.trialBalanceAccount.createMany({ data: rows });
  }

  // 4) extras (scaled + framework/transition from profile) + auditor signature
  const extras = scaleExtras(EXTRAS, k);
  extras.framework = profile.framework;
  extras.transition = profile.transition;
  await setExtras(CONTRACT_ID, extras);
  await prisma.subscriber.update({ where: { id: subscriberId }, data: { licenseName: "محمد سعيد بن حسن", licenseNumber: "594", licenseType: "محاسبون ومراجعون قانونيون" } }).catch(() => {});

  const assets = TB.filter((r) => r[0][0] === "1").reduce((s, r) => s + scaleVal(r[2], k), 0);
  const liabEq = TB.filter((r) => r[0][0] === "2" || r[0][0] === "3").reduce((s, r) => s + scaleVal(r[2], k), 0);
  console.log(`✅ ${profile.name} (${profile.legalEntity}) على ${CONTRACT_ID} — موجودات ${assets} | متوازن؟ ${Math.abs(assets + liabEq) < 2}`);
}

(async () => {
  const target = process.argv[2];
  const ids = target ? [target] : Object.keys(PROFILES);
  for (const id of ids) await seedCompany(id);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERR:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
