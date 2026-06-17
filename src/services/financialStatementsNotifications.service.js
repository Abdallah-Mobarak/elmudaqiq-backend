/**
 * Financial-statements notifications (FRD 2.3.14).
 *
 * Thin wrappers over utils/notify.js that target the right recipient role for
 * each event. All are fail-safe (never throw) — a failed notification must not
 * break statement generation or trial-balance posting.
 */
const { ROLES } = require("../config/roles");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../config/notificationTypes");
const notify = require("../utils/notify");

const label = (contract) => (contract && contract.customerName) || "المنشأة";

/** Statements generated → Audit Manager. */
async function onStatementsGenerated(contract, _user) {
  if (!contract) return;
  return notify.notifyUsersByRole(contract.subscriberId, ROLES.AUDIT_MANAGER, {
    title: "تم توليد القوائم المالية",
    message: `تم توليد القوائم المالية للارتباط «${label(contract)}» وهي جاهزة للمراجعة.`,
    type: NOTIFICATION_TYPES.STATEMENTS_GENERATED,
    entityType: ENTITY_TYPES.FINANCIAL_STATEMENTS,
    entityId: contract.id,
  });
}

/** Independent auditor's report issued → Archive. */
async function onReportIssued(contract, _user) {
  if (!contract) return;
  return notify.notifyUsersByRole(contract.subscriberId, ROLES.ARCHIVE, {
    title: "تم إصدار تقرير مراجع الحسابات",
    message: `تم إصدار تقرير مراجع الحسابات للارتباط «${label(contract)}» وأرشفته.`,
    type: NOTIFICATION_TYPES.REPORT_ISSUED,
    entityType: ENTITY_TYPES.FINANCIAL_STATEMENTS,
    entityId: contract.id,
  });
}

/** Opinion engine proposed an opinion → Auditor (Technical Auditor). */
async function onOpinionDetermined(contractId, _user) {
  const prisma = require("../config/prisma");
  const contract = await prisma.engagementContract
    .findUnique({ where: { id: contractId }, select: { id: true, subscriberId: true, customerName: true } })
    .catch(() => null);
  if (!contract) return;
  const { resolveOpinionType, OPINION_AR } = require("./auditFindings.service");
  const type = await resolveOpinionType(contractId).catch(() => null);
  const ar = (type && OPINION_AR[type]) || "رأي";
  return notify.notifyUsersByRole(contract.subscriberId, ROLES.TECHNICAL_AUDITOR, {
    title: "تم اقتراح رأي المراجعة",
    message: `تم اقتراح «${ar}» للارتباط «${label(contract)}». يرجى المراجعة والتأكيد.`,
    type: NOTIFICATION_TYPES.OPINION_DETERMINED,
    entityType: ENTITY_TYPES.FINANCIAL_STATEMENTS,
    entityId: contract.id,
  });
}

/** Posting attempted with unmapped accounts → the acting preparer. */
async function onUnmappedAccounts(user, count) {
  if (!user || !user.id) return;
  return notify.notifyUser(user.id, {
    title: "حسابات غير مربوطة",
    message: `يوجد ${count || ""} حساب غير مربوط في ميزان المراجعة. يرجى إكمال الربط قبل الترحيل.`.replace("  ", " "),
    type: NOTIFICATION_TYPES.UNMAPPED_ACCOUNTS,
    entityType: ENTITY_TYPES.FINANCIAL_STATEMENTS,
  });
}

/** Imported trial balance does not balance → the acting preparer. */
async function onTrialBalanceOutOfBalance(user, difference) {
  if (!user || !user.id) return;
  return notify.notifyUser(user.id, {
    title: "ميزان المراجعة غير متوازن",
    message: `ميزان المراجعة غير متوازن (مدين ≠ دائن)${difference != null ? ` بفرق ${difference}` : ""}. يرجى المراجعة قبل الترحيل.`,
    type: NOTIFICATION_TYPES.TRIAL_BALANCE_OUT_OF_BALANCE,
    entityType: ENTITY_TYPES.FINANCIAL_STATEMENTS,
  });
}

module.exports = {
  onStatementsGenerated,
  onReportIssued,
  onOpinionDetermined,
  onUnmappedAccounts,
  onTrialBalanceOutOfBalance,
};
