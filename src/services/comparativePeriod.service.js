const prisma = require("../config/prisma");
const { calculateBalances } = require("../utils/calculations/trialBalanceCalc");

/*
 * الفترة المقارنة (السنة السابقة) في القوائم المالية.
 *
 * السنة الحالية تُستورد من ملف الميزان (Excel). أما السنة المقارنة فتأتي بإحدى طريقتين:
 *   1) استدعاء تلقائي: لو نفس الشركة لها عقد سنة سابقة عندنا (نطابق بالسجل التجاري)
 *      ننسخ أرصدتها الختامية المؤكدة كفترة مقارنة.
 *   2) إدخال يدوي: يدخل المستخدم ميزان مراجعة كامل بيده لسنة يحددها (مصدرها غالباً
 *      PDF من المراجع السابق فلا يمكن استيراده).
 *
 * كلاهما يُخزَّن كصف TrialBalance على نفس العقد بقيمة period مختلفة (السنة)، فيلتقطه
 * مولّد القوائم تلقائياً كعمود مقارنة.
 */

const yearOfDate = (d) => String((d ? new Date(d) : new Date()).getFullYear());

async function loadContract(contractId) {
  const contract = await prisma.engagementContract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      subscriberId: true,
      commercialRegisterNumber: true,
      fiscalYearEnd: true,
    },
  });
  if (!contract) {
    const e = new Error("لم يتم العثور على عقد الارتباط.");
    e.status = 404;
    throw e;
  }
  return contract;
}

/**
 * سياق الفترة المقارنة لعقد: السنة الحالية، سنوات المقارنة الموجودة، وهل يوجد عقد
 * سنة سابقة لنفس الشركة يمكن الاستدعاء منه.
 */
async function getContext(contractId) {
  const contract = await loadContract(contractId);
  const currentYear = yearOfDate(contract.fiscalYearEnd);

  const balances = await prisma.trialBalance.findMany({
    where: { contractId },
    select: { id: true, period: true, status: true, _count: { select: { accounts: true } } },
    orderBy: { period: "desc" },
  });

  const comparatives = balances
    .filter((b) => b.period && b.period !== currentYear)
    .map((b) => ({ year: b.period, status: b.status, accountsCount: b._count.accounts }));

  // هل نفس الشركة (نفس السجل التجاري) لها عقد بسنة أقدم مع ميزان مؤكد؟
  const linkable = await findLinkablePrior(contract, currentYear);

  return {
    currentYear,
    hasCurrent: balances.some((b) => b.period === currentYear && b._count.accounts > 0),
    comparatives,
    linkable, // { contractId, year } أو null
  };
}

/** ابحث عن عقد سنة سابقة لنفس الشركة (السجل التجاري) يحمل ميزاناً معتمداً. */
async function findLinkablePrior(contract, currentYear) {
  if (!contract.commercialRegisterNumber) return null;
  const priors = await prisma.engagementContract.findMany({
    where: {
      subscriberId: contract.subscriberId,
      commercialRegisterNumber: contract.commercialRegisterNumber,
      id: { not: contract.id },
    },
    select: { id: true, fiscalYearEnd: true },
  });
  let best = null;
  for (const p of priors) {
    const y = yearOfDate(p.fiscalYearEnd);
    if (Number(y) >= Number(currentYear)) continue; // نريد سنة أقدم فقط
    const tb = await prisma.trialBalance.findFirst({
      where: { contractId: p.id, status: "CONFIRMED" },
      orderBy: { period: "desc" },
      select: { id: true, period: true },
    });
    if (!tb) continue;
    const year = tb.period || y;
    if (!best || Number(year) > Number(best.year)) best = { contractId: p.id, sourceTrialBalanceId: tb.id, year };
  }
  return best;
}

/** احذف أي فترة مقارنة قائمة لنفس السنة (لإعادة الإنشاء بأمان). */
async function dropComparative(contractId, year) {
  const existing = await prisma.trialBalance.findFirst({ where: { contractId, period: String(year) } });
  if (existing) {
    await prisma.trialBalance.delete({ where: { id: existing.id } }); // الحسابات تُحذف تلقائياً (Cascade)
  }
}

/**
 * إنشاء فترة مقارنة يدوية لسنة محددة، مُهيّأة بنفس حسابات السنة الحالية (الكود/الاسم/
 * الربط بالدليل) بأرصدة صفرية، ليكتب المستخدم القيم بيده. لو لا يوجد ميزان حالي بعد،
 * تُنشأ فترة فارغة يضيف إليها المستخدم الحسابات.
 */
async function createManual(contractId, year, userId) {
  const contract = await loadContract(contractId);
  year = String(year);
  if (year === yearOfDate(contract.fiscalYearEnd)) {
    const e = new Error("سنة المقارنة يجب أن تختلف عن السنة الحالية للعقد.");
    e.status = 400;
    throw e;
  }
  await dropComparative(contractId, year);

  const tb = await prisma.trialBalance.create({
    data: { contractId, uploadedById: userId, status: "DRAFT", period: year },
  });

  // انسخ هيكل حسابات السنة الحالية (بدون قيم) لتسهيل الإدخال والحفاظ على نفس الربط.
  const current = await prisma.trialBalance.findFirst({
    where: { contractId, period: yearOfDate(contract.fiscalYearEnd) },
    select: { id: true },
  });
  if (current) {
    const src = await prisma.trialBalanceAccount.findMany({
      where: { trialBalanceId: current.id },
      select: { accountCode: true, accountName: true, assignedAccountGuideId: true, worksheetOrder: true },
    });
    if (src.length) {
      await prisma.trialBalanceAccount.createMany({
        data: src.map((a) => ({
          trialBalanceId: tb.id,
          accountCode: a.accountCode,
          accountName: a.accountName,
          assignedAccountGuideId: a.assignedAccountGuideId,
          worksheetOrder: a.worksheetOrder,
        })),
      });
    }
  }
  return getGrid(contractId, year);
}

/** استدعاء الفترة المقارنة من عقد سنة سابقة لنفس الشركة (نسخ الأرصدة الختامية). */
async function linkFromPrior(contractId, userId) {
  const contract = await loadContract(contractId);
  const currentYear = yearOfDate(contract.fiscalYearEnd);
  const link = await findLinkablePrior(contract, currentYear);
  if (!link) {
    const e = new Error("لا يوجد عقد سنة سابقة لنفس الشركة يمكن الاستدعاء منه.");
    e.status = 404;
    throw e;
  }
  await dropComparative(contractId, link.year);

  const tb = await prisma.trialBalance.create({
    data: { contractId, uploadedById: userId, status: "CONFIRMED", period: String(link.year) },
  });

  const src = await prisma.trialBalanceAccount.findMany({ where: { trialBalanceId: link.sourceTrialBalanceId } });
  if (src.length) {
    await prisma.trialBalanceAccount.createMany({
      data: src.map((a) => ({
        trialBalanceId: tb.id,
        accountCode: a.accountCode,
        accountName: a.accountName,
        assignedAccountGuideId: a.assignedAccountGuideId,
        worksheetOrder: a.worksheetOrder,
        beginningDebit: a.beginningDebit,
        beginningCredit: a.beginningCredit,
        debitMovement: a.debitMovement,
        creditMovement: a.creditMovement,
        adjustedBeginningBalance: a.adjustedBeginningBalance,
        netMovement: a.netMovement,
        closingDebit: a.closingDebit,
        closingCredit: a.closingCredit,
        finalBalance: a.finalBalance,
        balanceType: a.balanceType,
      })),
    });
  }
  return getGrid(contractId, link.year);
}

/** حفظ القيم المُدخلة يدوياً لفترة المقارنة (إعادة حساب الأرصدة لكل حساب). */
async function saveManual(contractId, year, accounts) {
  year = String(year);
  const tb = await prisma.trialBalance.findFirst({ where: { contractId, period: year } });
  if (!tb) {
    const e = new Error("لم يتم العثور على فترة المقارنة. أنشئها أولاً.");
    e.status = 404;
    throw e;
  }
  if (tb.status === "CONFIRMED") {
    const e = new Error("فترة المقارنة معتمدة ومقفلة، لا يمكن تعديلها.");
    e.status = 403;
    throw e;
  }
  if (!Array.isArray(accounts)) {
    const e = new Error("صيغة الحسابات غير صحيحة.");
    e.status = 400;
    throw e;
  }

  // يدعم إضافة صفوف جديدة: أي حساب في المصفوفة (قديم أو مضاف يدوياً) يُدخَل.
  const rows = accounts
    .filter((a) => a && String(a.accountCode || "").trim())
    .map((a) => {
      const base = {
        trialBalanceId: tb.id,
        accountCode: String(a.accountCode).trim(),
        accountName: String(a.accountName || "بدون اسم").trim(),
        beginningDebit: Number(a.beginningDebit) || 0,
        beginningCredit: Number(a.beginningCredit) || 0,
        debitMovement: Number(a.debitMovement) || 0,
        creditMovement: Number(a.creditMovement) || 0,
        assignedAccountGuideId: a.assignedAccountGuideId != null ? Number(a.assignedAccountGuideId) : null,
        worksheetOrder: a.worksheetOrder != null ? Number(a.worksheetOrder) : null,
      };
      return { ...base, ...calculateBalances(base) };
    });

  // منع تكرار كود الحساب (قيد unique على [trialBalanceId, accountCode]).
  const seen = new Set();
  const dups = new Set();
  for (const r of rows) {
    if (seen.has(r.accountCode)) dups.add(r.accountCode);
    seen.add(r.accountCode);
  }
  if (dups.size) {
    const e = new Error("يوجد أكواد حسابات مكررة: " + [...dups].join("، "));
    e.status = 400;
    throw e;
  }

  // استبدال كامل: احذف القديم وأدخل الجديد بأرصدة محسوبة.
  await prisma.trialBalanceAccount.deleteMany({ where: { trialBalanceId: tb.id } });
  if (rows.length) await prisma.trialBalanceAccount.createMany({ data: rows });

  return getGrid(contractId, year);
}

/** جلب جدول فترة المقارنة للعرض/التعديل. */
async function getGrid(contractId, year) {
  year = String(year);
  const tb = await prisma.trialBalance.findFirst({ where: { contractId, period: year } });
  if (!tb) {
    const e = new Error("لم يتم العثور على فترة المقارنة.");
    e.status = 404;
    throw e;
  }
  const accounts = await prisma.trialBalanceAccount.findMany({
    where: { trialBalanceId: tb.id },
    orderBy: { accountCode: "asc" },
  });
  return { year, status: tb.status, accountsCount: accounts.length, accounts };
}

/** اعتماد وقفل فترة المقارنة. */
async function confirm(contractId, year) {
  year = String(year);
  const tb = await prisma.trialBalance.findFirst({ where: { contractId, period: year } });
  if (!tb) {
    const e = new Error("لم يتم العثور على فترة المقارنة.");
    e.status = 404;
    throw e;
  }
  await prisma.trialBalance.update({ where: { id: tb.id }, data: { status: "CONFIRMED" } });
  return { year, status: "CONFIRMED" };
}

module.exports = {
  getContext,
  createManual,
  linkFromPrior,
  saveManual,
  getGrid,
  confirm,
};
