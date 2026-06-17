const prisma = require("../config/prisma");

/**
 * ===========================================================================
 * Financial Statements Generation Service (الميزانية)
 * ---------------------------------------------------------------------------
 * Builds the financial statements from the existing pipeline:
 *   Trial Balance Account (finalBalance) --assignedAccountGuideId--> Account Guide
 *   Account Guide hierarchy (by accountNumber prefix) rolls the amounts up:
 *      Level 1 = main group (heading)        e.g. الموجودات / المطلوبات / حقوق الملكية
 *      Level 2 = sub-classification (heading) e.g. الموجودات المتداولة / غير المتداولة
 *      Level 3 = analytical group (line)      e.g. النقد وما في حكمه  (= sum of mapped TB accounts)
 *      Level 4 = detail account               appears in the notes, NOT on the face (FRD 2.3.4)
 *
 * NOTE (assumptions to verify against real data — flagged intentionally):
 *  - Classification of a Level-1 root into ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE
 *    is derived from the root account NAME (Arabic keywords), falling back to the
 *    first digit of accountNumber (1=Assets,2=Liabilities,3=Equity,4=Revenue,5=Expenses).
 *  - finalBalance sign convention from trialBalanceCalc: DEBIT > 0, CREDIT < 0.
 *    On the face of the statement every figure is shown POSITIVE; the sign is
 *    applied per section so liabilities/equity/revenue (credit nature) read positive.
 * ===========================================================================
 */

const SECTION = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
  UNKNOWN: "UNKNOWN",
};

// Credit-nature sections are displayed as the absolute (positive) value.
const CREDIT_NATURE_SECTIONS = new Set([SECTION.LIABILITY, SECTION.EQUITY, SECTION.REVENUE]);

/** Classify a Level-1 root account into a statement section. */
function classifyRoot(accountName, accountNumber) {
  const name = String(accountName || "");
  if (/(موجودات|أصول|اصول)/.test(name)) return SECTION.ASSET;
  if (/(مطلوبات|خصوم|التزامات|الزامات)/.test(name)) return SECTION.LIABILITY;
  if (/(حقوق|ملكية|الملكية|الشركاء|المساهمين|المشتركين|رأس المال|راس المال)/.test(name))
    return SECTION.EQUITY;
  if (/(إيراد|ايراد|الإيرادات|الايرادات)/.test(name)) return SECTION.REVENUE;
  if (/(مصروف|مصاريف|تكلفة|تكاليف)/.test(name)) return SECTION.EXPENSE;

  // Fallback: first digit of the account number.
  const first = String(accountNumber || "").trim()[0];
  return (
    { 1: SECTION.ASSET, 2: SECTION.LIABILITY, 3: SECTION.EQUITY, 4: SECTION.REVENUE, 5: SECTION.EXPENSE }[
      first
    ] || SECTION.UNKNOWN
  );
}

/**
 * Build a tree out of the account guide rows using the accountNumber prefix
 * (same hierarchy rule used by utils/hierarchicalSort.js). Returns roots + a flat
 * id->node lookup. Each node carries `depth` (root = 1).
 */
function buildGuideTree(guides) {
  const nodes = guides.map((g) => ({
    id: g.id,
    accountNumber: String(g.accountNumber ?? "").trim(),
    accountName: g.accountName,
    level: g.level,
    children: [],
    own: 0, // sum of TB finalBalance mapped directly to this guide
    amount: 0, // rolled-up total (own + descendants)
    depth: 1,
  }));

  const byKey = new Map();
  for (const n of nodes) {
    if (!byKey.has(n.accountNumber)) byKey.set(n.accountNumber, []);
    byKey.get(n.accountNumber).push(n);
  }

  const roots = [];
  for (const n of nodes) {
    const key = n.accountNumber;
    let parent = null;
    for (let i = key.length - 1; i > 0; i--) {
      const pk = key.slice(0, i);
      if (byKey.has(pk)) {
        parent = byKey.get(pk)[0];
        break;
      }
    }
    if (parent) parent.children.push(n);
    else roots.push(n);
  }

  // Assign depth top-down and sort children by accountNumber.
  const setDepth = (node, depth) => {
    node.depth = depth;
    node.children.sort((a, b) =>
      a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true })
    );
    node.children.forEach((c) => setDepth(c, depth + 1));
  };
  roots
    .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true }))
    .forEach((r) => setDepth(r, 1));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  return { roots, byId };
}

/** Roll the mapped balances up the tree: amount = own + sum(children.amount). */
function rollUp(node) {
  let total = node.own;
  for (const c of node.children) total += rollUp(c);
  node.amount = total;
  return total;
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const isZero = (n) => Math.abs(round2(n)) < 0.005;

/**
 * Load the data needed for any statement of a contract:
 *  - the contract (for subscriberId + entity info)
 *  - the trial balance accounts that are mapped (assignedAccountGuideId != null)
 *  - the full account guide for the subscriber
 * Returns the built+rolled tree and the section index.
 */
async function loadModels(contractId) {
  const contract = await prisma.engagementContract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      subscriberId: true,
      customerName: true,
      legalEntity: true,
      legalEntityType: true,
      nationality: true,
      currency: true,
      fiscalYearStart: true,
      fiscalYearEnd: true,
      commercialRegisterNumber: true,
      taxNumber: true,
      unifiedNumber: true,
      address: true,
      email: true,
      postalCode: true,
      region: true,
      contactPhone: true,
    },
  });
  if (!contract) {
    const e = new Error("لم يتم العثور على عقد الارتباط.");
    e.status = 404;
    throw e;
  }

  // كل الموازين للعقد، الأحدث أولاً (الفترة الأعلى = السنة الحالية، والأقدم أعمدة مقارنة).
  const trialBalances = await prisma.trialBalance.findMany({
    where: { contractId },
    orderBy: { period: "desc" },
    select: { id: true, status: true, period: true },
  });
  if (!trialBalances.length) {
    const e = new Error("لم يتم العثور على ميزان مراجعة لهذا العقد.");
    e.status = 404;
    throw e;
  }

  // دليل الحسابات مشترك على مستوى المشترك — يُحمّل مرة واحدة لكل الفترات.
  const guides = await prisma.accountGuide.findMany({
    where: { subscriberId: contract.subscriberId },
    select: { id: true, level: true, accountNumber: true, accountName: true },
  });

  const accountsByTb = await Promise.all(
    trialBalances.map((tb) =>
      prisma.trialBalanceAccount.findMany({
        where: { trialBalanceId: tb.id, assignedAccountGuideId: { not: null } },
        select: {
          id: true,
          accountCode: true,
          accountName: true,
          finalBalance: true,
          assignedAccountGuideId: true,
          beginningDebit: true,
          beginningCredit: true,
          debitMovement: true,
          creditMovement: true,
        },
      })
    )
  );

  return trialBalances.map((tb, i) =>
    buildModel({ contract, trialBalanceStatus: tb.status, tbAccounts: accountsByTb[i], guides, period: tb.period })
  );
}

/** Backward-compatible single-period loader: returns the current (latest) period model. */
async function loadModel(contractId) {
  return (await loadModels(contractId))[0];
}

// --- Auditor signature block (FRD 2.3.11 / BR-8): locked subscriber fields ---
function gregorianLabel(d) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}م`;
}
function hijriLabel(d) {
  try {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const parts = fmt.formatToParts(d);
    const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
    const y = get("year");
    if (!y) return null;
    return `${get("day")}/${get("month")}/${y}هـ`;
  } catch (_) {
    return null;
  }
}

/**
 * Build the auditor signature block from the subscriber's locked profile fields.
 * Name / license / office are non-editable subscriber data (FRD 2.3.11, BR-8);
 * the report date is the issuance date (Gregorian + Umm al-Qura Hijri).
 */
async function loadAuditor(subscriberId, reportDate = new Date()) {
  const sub = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: {
      licenseName: true,
      licenseNumber: true,
      licenseType: true,
      city: { select: { name: true } },
    },
  });
  return {
    name: (sub && sub.licenseName) || "",
    office: "المكتب الرئيسي",
    preamble: (sub && sub.licenseType) || "محاسبون ومراجعون قانونيون",
    license: (sub && sub.licenseNumber) || "",
    city: (sub && sub.city && sub.city.name) || "",
    gregorianDate: gregorianLabel(reportDate),
    hijriDate: hijriLabel(reportDate) || "",
  };
}

/**
 * Pure model builder (no DB): given the contract, the mapped trial-balance
 * accounts and the account guide rows, build the tree, roll the balances up,
 * and index the roots by statement section. Reused by loadModel and by demos/tests.
 */
function buildModel({ contract, trialBalanceStatus = null, tbAccounts = [], guides = [], period = "" }) {
  const { roots, byId } = buildGuideTree(guides);

  // Attach mapped TB balances onto their guide node and keep the detail (Level-4 notes).
  const detailByGuide = new Map(); // guideId -> [{ accountCode, accountName, amount }]
  for (const a of tbAccounts) {
    const node = byId.get(a.assignedAccountGuideId);
    if (!node) continue; // mapped to a guide outside this subscriber (shouldn't happen)
    const bal = Number(a.finalBalance) || 0;
    node.own += bal;
    if (!detailByGuide.has(node.id)) detailByGuide.set(node.id, []);
    detailByGuide.get(node.id).push({
      accountCode: a.accountCode,
      accountName: a.accountName,
      amount: bal,
      // movement columns (for the Property/Plant & Equipment schedule — FRD Table H)
      beginningDebit: Number(a.beginningDebit) || 0,
      beginningCredit: Number(a.beginningCredit) || 0,
      debitMovement: Number(a.debitMovement) || 0,
      creditMovement: Number(a.creditMovement) || 0,
    });
  }

  roots.forEach(rollUp);

  // Attach own detail to each node + index by accountNumber (for breakdown notes).
  const byAccountNumber = new Map();
  for (const n of byId.values()) {
    n.detailOwn = detailByGuide.get(n.id) || [];
    byAccountNumber.set(n.accountNumber, n);
  }

  // Index roots by section.
  const sections = {};
  for (const root of roots) {
    const section = classifyRoot(root.accountName, root.accountNumber);
    if (!sections[section]) sections[section] = [];
    sections[section].push(root);
  }

  return {
    contract,
    trialBalanceStatus,
    period,
    roots,
    byId,
    byAccountNumber,
    sections,
    detailByGuide,
    mappedCount: tbAccounts.length,
  };
}

/** All Level-4 detail (trial-balance accounts) under a node, including descendants. */
function collectSubtreeDetail(node) {
  let out = [...(node.detailOwn || [])];
  for (const c of node.children) out = out.concat(collectSubtreeDetail(c));
  return out;
}

/** Detail accounts behind a statement line, looked up by its account number. */
function getLineDetail(model, accountNumber) {
  const node = model.byAccountNumber && model.byAccountNumber.get(String(accountNumber));
  return node ? collectSubtreeDetail(node) : [];
}

/**
 * Turn a section's roots into face-of-statement groups/lines, comparatively
 * across one or more periods (FRD Standard 5-column mode: current/prior/opening).
 *
 * - `roots` come from the PRIMARY (current) period model — it drives the structure.
 * - `periodModels` is the array of period models (current first); each line's
 *   amount for a period is looked up by accountNumber in that period's model.
 * - Display rule (FRD 2.3.4): depth 1 & 2 are headings, depth 3 is the line.
 * - A line is hidden only if it is zero in ALL periods (FRD Table E).
 * - `noteSeq` is a shared mutable counter so notes run in order of appearance.
 *
 * Each line/group/section carries an `amounts` / `subtotals` / `totals` ARRAY
 * (one value per period).
 */
function buildSectionView(roots, section, noteSeq, periodModels) {
  const sign = CREDIT_NATURE_SECTIONS.has(section) ? -1 : 1;
  const n = periodModels.length;

  const amountsFor = (accountNumber) =>
    periodModels.map((m) => {
      const node = m.byAccountNumber.get(String(accountNumber));
      return round2(sign * (node ? node.amount : 0));
    });
  const sumArrays = (arrays) => {
    const out = new Array(n).fill(0);
    for (const a of arrays) for (let i = 0; i < n; i++) out[i] += a[i];
    return out.map(round2);
  };
  const anyNonZero = (arr) => arr.some((v) => !isZero(v));

  const collectLines = (node) => {
    const lines = [];
    const walk = (x) => {
      if (x.depth === 3) {
        const amounts = amountsFor(x.accountNumber);
        if (anyNonZero(amounts)) {
          lines.push({ accountNumber: x.accountNumber, name: x.accountName, note: noteSeq.next++, amounts });
        }
        return; // depth 4+ belongs in the notes, not the face
      }
      x.children.forEach(walk);
    };
    walk(node);
    return lines;
  };

  const groups = [];
  let sectionTotals = new Array(n).fill(0);

  const pushGroup = (title, accountNumber, lines) => {
    if (lines.length === 0) return;
    const subtotals = sumArrays(lines.map((l) => l.amounts));
    sectionTotals = sectionTotals.map((v, i) => v + subtotals[i]);
    groups.push({ title, accountNumber, lines, subtotals });
  };

  for (const root of roots) {
    const level2 = root.children.filter((c) => c.depth === 2);
    if (level2.length === 0) {
      pushGroup(root.accountName, root.accountNumber, collectLines(root));
    } else {
      for (const g2 of level2) pushGroup(g2.accountName, g2.accountNumber, collectLines(g2));
    }
  }

  return { groups, totals: sectionTotals.map(round2) };
}

const SVC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
function defaultPeriodLabel(model) {
  const d = model.contract && model.contract.fiscalYearEnd ? new Date(model.contract.fiscalYearEnd) : null;
  // Each period model carries its own fiscal year (model.period); when it is a
  // 4-digit year, use it so comparative columns show the right year (e.g. 2024).
  const periodYear = /^\d{4}$/.test(model.period || "") ? Number(model.period) : null;
  if (!d || isNaN(d)) return periodYear ? `31 ديسمبر ${periodYear}` : "السنة الحالية";
  const year = periodYear || d.getFullYear();
  return `${d.getDate()} ${SVC_MONTHS[d.getMonth()]} ${year}`;
}
function normalizePeriods(models) {
  return Array.isArray(models) ? models : [models];
}

const SECTION_TITLES = {
  [SECTION.ASSET]: "الموجودات",
  [SECTION.LIABILITY]: "المطلوبات",
  [SECTION.EQUITY]: "حقوق الملكية",
  [SECTION.REVENUE]: "الإيرادات",
  [SECTION.EXPENSE]: "المصروفات",
};

/**
 * Statement of Financial Position from one or more period models.
 * `models` may be a single model (one column) or an array [current, prior, opening].
 */
function buildPositionStatement(models, noteSeq = { next: 6 }, periodLabels) {
  const periodModels = normalizePeriods(models);
  const primary = periodModels[0];
  const periods = periodLabels || periodModels.map(defaultPeriodLabel);

  const assets = buildSectionView(primary.sections[SECTION.ASSET] || [], SECTION.ASSET, noteSeq, periodModels);
  const liabilities = buildSectionView(primary.sections[SECTION.LIABILITY] || [], SECTION.LIABILITY, noteSeq, periodModels);
  const equity = buildSectionView(primary.sections[SECTION.EQUITY] || [], SECTION.EQUITY, noteSeq, periodModels);

  const totalAssets = assets.totals;
  const totalLiabilities = liabilities.totals;
  const totalEquity = equity.totals;
  const liabilitiesPlusEquity = totalLiabilities.map((v, i) => round2(v + totalEquity[i]));
  const difference = totalAssets.map((v, i) => round2(v - liabilitiesPlusEquity[i]));

  return {
    type: "STATEMENT_OF_FINANCIAL_POSITION",
    title: "قائمة المركز المالي",
    contract: primary.contract,
    status: primary.trialBalanceStatus,
    mappedAccounts: primary.mappedCount,
    periods,
    sections: [
      { key: SECTION.ASSET, title: SECTION_TITLES[SECTION.ASSET], ...assets },
      { key: SECTION.LIABILITY, title: SECTION_TITLES[SECTION.LIABILITY], ...liabilities },
      { key: SECTION.EQUITY, title: SECTION_TITLES[SECTION.EQUITY], ...equity },
    ],
    totals: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      liabilitiesPlusEquity,
      balanced: isZero(difference[0]),
      difference,
    },
  };
}

/** Statement of Financial Position — قائمة المركز المالي (loads from DB). */
async function generateStatementOfFinancialPosition(contractId) {
  return buildPositionStatement(await loadModels(contractId));
}

/** Statement of Comprehensive Income from one or more period models. */
function buildIncomeStatement(models, noteSeq = { next: 6 }, periodLabels) {
  const periodModels = normalizePeriods(models);
  const primary = periodModels[0];
  const periods = periodLabels || periodModels.map(defaultPeriodLabel);

  const revenue = buildSectionView(primary.sections[SECTION.REVENUE] || [], SECTION.REVENUE, noteSeq, periodModels);
  const expenses = buildSectionView(primary.sections[SECTION.EXPENSE] || [], SECTION.EXPENSE, noteSeq, periodModels);

  const totalRevenue = revenue.totals;
  const totalExpenses = expenses.totals;
  const netResult = totalRevenue.map((v, i) => round2(v - totalExpenses[i]));

  return {
    type: "STATEMENT_OF_COMPREHENSIVE_INCOME",
    title: "قائمة الدخل الشامل",
    contract: primary.contract,
    status: primary.trialBalanceStatus,
    mappedAccounts: primary.mappedCount,
    periods,
    sections: [
      { key: SECTION.REVENUE, title: SECTION_TITLES[SECTION.REVENUE], ...revenue },
      { key: SECTION.EXPENSE, title: SECTION_TITLES[SECTION.EXPENSE], ...expenses },
    ],
    totals: {
      totalRevenue,
      totalExpenses,
      netResult,
      netResultLabel: netResult[0] >= 0 ? "صافي الربح" : "صافي الخسارة",
    },
  };
}

/** Statement of Comprehensive Income — قائمة الدخل الشامل (loads from DB). */
async function generateStatementOfIncome(contractId) {
  return buildIncomeStatement(await loadModels(contractId));
}

/**
 * Full report data — model + both statements with continuous note numbering.
 * Used by the full-report PDF endpoint (passed to renderFullReport).
 */
async function generateFullReport(contractId, options = {}) {
  const models = await loadModels(contractId); // [current, prior, ...] for comparative columns
  const primary = models[0];
  const noteSeq = { next: 6 }; // shared so notes run continuously across statements
  const position = buildPositionStatement(models, noteSeq);
  const income = buildIncomeStatement(models, noteSeq);
  const auditor = await loadAuditor(primary.contract.subscriberId, options.reportDate);
  return { contract: primary.contract, model: primary, position, income, auditor };
}

module.exports = {
  SECTION,
  classifyRoot,
  buildGuideTree,
  buildModel,
  buildPositionStatement,
  buildIncomeStatement,
  getLineDetail,
  generateStatementOfFinancialPosition,
  generateStatementOfIncome,
  generateFullReport,
  _loadModel: loadModel, // exported for future statements/notes
  _loadModels: loadModels,
};
