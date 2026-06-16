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
  [121, "3", "ممتلكات وآلات ومعدات"], [1211, "4", "معدات وآليات"],
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
const TB = [
  ["1111", "الصندوق", 50000, 1111],
  ["1112", "البنك الأهلي", 250000, 1112],
  ["1121", "عملاء", 200000, 1121],
  ["1131", "بضاعة", 200000, 1131],
  ["1211", "معدات وآليات", 300000, 1211, { beginningDebit: 350000, debitMovement: 50000, creditMovement: 100000 }],
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

  // 3) Rebuild the trial balance accounts (mapped + balanced).
  const tb = await prisma.trialBalance.findUnique({ where: { contractId: CONTRACT_ID }, select: { id: true } });
  let trialBalanceId = tb && tb.id;
  if (!trialBalanceId) {
    const created = await prisma.trialBalance.create({
      data: { contractId: CONTRACT_ID, status: "CONFIRMED", uploadedById: (await anyUser(subscriberId)) },
      select: { id: true },
    });
    trialBalanceId = created.id;
  } else {
    await prisma.trialBalanceAccount.deleteMany({ where: { trialBalanceId } });
    await prisma.trialBalance.update({ where: { id: trialBalanceId }, data: { status: "CONFIRMED" } });
  }

  const rows = TB.map(([accountCode, accountName, finalBalance, num, mv]) => ({
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
  console.log(`✅ تم الزرع على العقد ${CONTRACT_ID}`);
  console.log(`   دليل الحسابات: ${guides.length} حساب | الميزان: ${rows.length} حساب (${mapped} مربوط)`);
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
