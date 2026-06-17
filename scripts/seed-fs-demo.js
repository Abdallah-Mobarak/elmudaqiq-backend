/**
 * Seed a coherent financial-statements dataset onto an existing contract:
 *  - a 4-level chart of accounts for the contract's subscriber
 *  - nicer entity display fields on the contract
 *  - a balanced, fully-mapped trial balance
 *
 * Usage: node scripts/seed-fs-demo.js [contractId]
 */
const prisma = require("../src/config/prisma");

const CONTRACT_ID = process.argv[2] || "dae46abe-3c09-4640-9a6e-80ba7b453663";

// 4-level chart: [accountNumber, level, name]
const CHART = [
  [1, "1", "الموجودات"],
  [11, "2", "الموجودات المتداولة"],
  [111, "3", "النقد وما في حكمه"], [1111, "4", "الصندوق"], [1112, "4", "البنك الأهلي"],
  [112, "3", "ذمم مدينة تجارية"], [1121, "4", "عملاء"],
  [113, "3", "المخزون"], [1131, "4", "بضاعة"],
  [12, "2", "الموجودات غير المتداولة"],
  [121, "3", "ممتلكات وآلات ومعدات"], [1211, "4", "معدات وآليات"], [1212, "4", "مجمع إهلاك المعدات"],
  [2, "1", "المطلوبات"],
  [21, "2", "المطلوبات المتداولة"],
  [211, "3", "ذمم وأرصدة دائنة تجارية"], [2111, "4", "موردون"],
  [212, "3", "مصروفات مستحقة"], [2121, "4", "مستحقات"],
  [22, "2", "المطلوبات غير المتداولة"],
  [221, "3", "التزامات منافع الموظفين"], [2211, "4", "مكافأة نهاية الخدمة"],
  [3, "1", "حقوق الملكية"],
  [31, "2", "رأس المال والأرباح"],
  [311, "3", "رأس المال"], [3111, "4", "رأس المال"],
  [312, "3", "الأرباح المبقاة"], [3121, "4", "الأرباح المبقاة"],
  [4, "1", "الإيرادات"],
  [41, "2", "إيرادات النشاط"],
  [411, "3", "المبيعات"], [4111, "4", "مبيعات"],
  [5, "1", "المصروفات"],
  [51, "2", "المصروفات التشغيلية"],
  [511, "3", "تكلفة المبيعات"], [5111, "4", "تكلفة مبيعات"],
  [512, "3", "مصروفات عمومية وإدارية"], [5121, "4", "رواتب وأجور"], [5122, "4", "إيجارات"],
];

// Trial balance: [code, name, finalBalance, guideAccountNumber, {movement}]
// Signs: assets/expenses positive (debit); liabilities/equity/revenue negative (credit).
//
// السنة الحالية (2025): متوازنة 1,000,000 = 300,000 + 700,000، صافي الدخل 50,000.
const TB_2025 = [
  ["1111", "الصندوق", 50000, 1111],
  ["1112", "البنك الأهلي", 250000, 1112],
  ["1121", "عملاء", 200000, 1121],
  ["1131", "بضاعة", 200000, 1131],
  ["1211", "معدات وآليات", 400000, 1211, { beginningDebit: 350000, debitMovement: 150000, creditMovement: 100000 }],
  ["1212", "مجمع إهلاك المعدات", -100000, 1212, { beginningCredit: 70000, creditMovement: 50000, debitMovement: 20000 }],
  ["2111", "موردون", -200000, 2111],
  ["2121", "مصروفات مستحقة", -50000, 2121],
  ["2211", "مخصص مكافأة نهاية الخدمة", -50000, 2211],
  ["3111", "رأس المال", -500000, 3111],
  ["3121", "الأرباح المبقاة", -200000, 3121],
  ["4111", "مبيعات", -600000, 4111],
  ["5111", "تكلفة مبيعات", 350000, 5111],
  ["5121", "رواتب وأجور", 150000, 5121],
  ["5122", "إيجارات", 50000, 5122],
];

// سنة المقارنة (2024): متوازنة 900,000 = 250,000 + 650,000، صافي الدخل 40,000.
// الأرباح المبقاة آخر 2024 = 150,000 ؛ 150,000 + صافي 2025 (50,000) = 200,000 (يتوافق مع 2025).
const TB_2024 = [
  ["1111", "الصندوق", 40000, 1111],
  ["1112", "البنك الأهلي", 230000, 1112],
  ["1121", "عملاء", 170000, 1121],
  ["1131", "بضاعة", 190000, 1131],
  ["1211", "معدات وآليات", 360000, 1211, { beginningDebit: 320000, debitMovement: 40000, creditMovement: 0 }],
  ["1212", "مجمع إهلاك المعدات", -90000, 1212, { beginningCredit: 50000, creditMovement: 40000, debitMovement: 0 }],
  ["2111", "موردون", -170000, 2111],
  ["2121", "مصروفات مستحقة", -40000, 2121],
  ["2211", "مخصص مكافأة نهاية الخدمة", -40000, 2211],
  ["3111", "رأس المال", -500000, 3111],
  ["3121", "الأرباح المبقاة", -150000, 3121],
  ["4111", "مبيعات", -500000, 4111],
  ["5111", "تكلفة مبيعات", 300000, 5111],
  ["5121", "رواتب وأجور", 130000, 5121],
  ["5122", "إيجارات", 30000, 5122],
];

const PERIODS = [
  { period: "2025", rows: TB_2025 },
  { period: "2024", rows: TB_2024 },
];

(async () => {
  const contract = await prisma.engagementContract.findUnique({
    where: { id: CONTRACT_ID },
    select: { id: true, subscriberId: true },
  });
  if (!contract) throw new Error("Contract not found: " + CONTRACT_ID);
  const subscriberId = contract.subscriberId;

  // 1) Ensure the chart exists for this subscriber (create missing by accountNumber).
  const existing = await prisma.accountGuide.findMany({
    where: { subscriberId, accountNumber: { in: CHART.map((c) => c[0]) } },
    select: { accountNumber: true },
  });
  const have = new Set(existing.map((e) => e.accountNumber));
  const toCreate = CHART.filter((c) => !have.has(c[0])).map(([accountNumber, level, accountName]) => ({
    subscriberId, accountNumber, level, accountName,
  }));
  if (toCreate.length) await prisma.accountGuide.createMany({ data: toCreate });

  const guides = await prisma.accountGuide.findMany({
    where: { subscriberId, accountNumber: { in: CHART.map((c) => c[0]) } },
    select: { id: true, accountNumber: true },
  });
  const guideByNum = new Map(guides.map((g) => [g.accountNumber, g.id]));

  // 2) Nicer entity fields on the contract (for the report header/notes).
  await prisma.engagementContract.update({
    where: { id: CONTRACT_ID },
    data: {
      customerName: "مؤسسة الأفق للتجارة",
      legalEntity: "مؤسسة فردية",
      nationality: "سعودية",
      fiscalYearEnd: new Date("2025-12-31"),
      commercialRegisterNumber: "1010567890",
      taxNumber: "300012345600003",
      unifiedNumber: "7001234567",
      address: "الرياض - حي العليا",
      email: "info@alufuq.example",
      postalCode: "12211",
      region: "الرياض",
    },
  });

  // 2b) Ensure the subscriber has locked auditor signature fields (FRD 2.3.11).
  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: {
      licenseName: "محمد سعيد بن حسن",
      licenseNumber: "594",
      licenseType: "محاسبون ومراجعون قانونيون",
    },
  }).catch((e) => console.log("   (تنبيه) تعذّر تحديث بيانات المراجع:", e.message));

  // 3) Rebuild the trial balance accounts for each period (mapped + balanced).
  // Clear any pre-existing balances for this contract (incl. legacy period="") so
  // we don't leave an extra stray period. Accounts cascade-delete with the balance.
  await prisma.trialBalance.deleteMany({ where: { contractId: CONTRACT_ID } });

  const uploaderId = await anyUser(subscriberId);
  for (const { period, rows: tbRows } of PERIODS) {
    const existingTb = await prisma.trialBalance.findFirst({
      where: { contractId: CONTRACT_ID, period },
      select: { id: true },
    });
    let trialBalanceId = existingTb && existingTb.id;
    if (!trialBalanceId) {
      const created = await prisma.trialBalance.create({
        data: { contractId: CONTRACT_ID, period, status: "CONFIRMED", uploadedById: uploaderId },
        select: { id: true },
      });
      trialBalanceId = created.id;
    } else {
      await prisma.trialBalanceAccount.deleteMany({ where: { trialBalanceId } });
      await prisma.trialBalance.update({ where: { id: trialBalanceId }, data: { status: "CONFIRMED" } });
    }

    const rows = tbRows.map(([accountCode, accountName, finalBalance, num, mv]) => ({
      trialBalanceId,
      accountCode,
      accountName,
      finalBalance,
      assignedAccountGuideId: guideByNum.get(num) || null,
      beginningDebit: (mv && mv.beginningDebit) || 0,
      beginningCredit: (mv && mv.beginningCredit) || 0,
      debitMovement: (mv && mv.debitMovement) || 0,
      creditMovement: (mv && mv.creditMovement) || 0,
    }));
    await prisma.trialBalanceAccount.createMany({ data: rows });
    const mapped = rows.filter((r) => r.assignedAccountGuideId).length;
    console.log(`   فترة ${period}: ${rows.length} حساب (${mapped} مربوط)`);
  }

  console.log(`✅ تم الزرع على العقد ${CONTRACT_ID}`);
  console.log(`   دليل الحسابات: ${guides.length} حساب | فترات: ${PERIODS.map((p) => p.period).join(", ")}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERR:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});

async function anyUser(subscriberId) {
  const u = await prisma.user.findFirst({ where: { subscriberId }, select: { id: true } })
    || await prisma.user.findFirst({ select: { id: true } });
  return u.id;
}
