/**
 * Working-paper audit findings + audit-opinion decision (FRD 2.3.3 / 2.3.9).
 *
 * Findings are recorded against an engagement; the opinion engine (Table D)
 * proposes an opinion from them, and the auditor confirms or overrides it
 * (any override is logged — BR-7).
 */
const prisma = require("../config/prisma");
const { determineOpinion, OPINION, OPINION_AR } = require("./auditOpinion.service");

const PROBLEM_TYPES = ["MISSTATEMENT", "SCOPE"];

async function ensureContract(contractId) {
  const c = await prisma.engagementContract.findUnique({ where: { id: contractId }, select: { id: true } });
  if (!c) {
    const e = new Error("لم يتم العثور على عقد الارتباط.");
    e.status = 404;
    throw e;
  }
}

async function listFindings(contractId) {
  return prisma.auditFinding.findMany({ where: { contractId }, orderBy: { createdAt: "asc" } });
}

async function createFinding(contractId, data, userId) {
  await ensureContract(contractId);
  const problemType = String(data.problemType || "").toUpperCase();
  if (!PROBLEM_TYPES.includes(problemType)) {
    const e = new Error("problemType يجب أن يكون MISSTATEMENT أو SCOPE.");
    e.status = 400;
    throw e;
  }
  if (!data.analyticalGroup) {
    const e = new Error("analyticalGroup مطلوب (اسم المجموعة/ورقة العمل).");
    e.status = 400;
    throw e;
  }
  const finding = await prisma.auditFinding.create({
    data: {
      contractId,
      analyticalGroup: String(data.analyticalGroup),
      problemType,
      material: Boolean(data.material),
      pervasive: Boolean(data.pervasive),
      description: data.description ? String(data.description) : null,
      createdById: userId || null,
    },
  });
  // Recompute the proposed opinion so the decision stays in sync with findings.
  await refreshProposedOpinion(contractId);
  return finding;
}

async function deleteFinding(contractId, id) {
  const f = await prisma.auditFinding.findUnique({ where: { id } });
  if (!f || f.contractId !== contractId) {
    const e = new Error("لم يتم العثور على الملاحظة.");
    e.status = 404;
    throw e;
  }
  await prisma.auditFinding.delete({ where: { id } });
  await refreshProposedOpinion(contractId);
  return { deleted: true };
}

/** Recompute the proposed opinion from current findings and store it (unless confirmed/overridden). */
async function refreshProposedOpinion(contractId) {
  const findings = await prisma.auditFinding.findMany({ where: { contractId } });
  const { opinion } = determineOpinion(findings);
  const existing = await prisma.opinionDecision.findUnique({ where: { contractId } });

  if (!existing) {
    return prisma.opinionDecision.create({
      data: { contractId, proposedType: opinion, finalType: opinion, status: "PROPOSED" },
    });
  }
  // Keep an explicit auditor confirmation/override; only refresh the proposal &
  // the final type while it is still auto (not overridden).
  return prisma.opinionDecision.update({
    where: { contractId },
    data: {
      proposedType: opinion,
      ...(existing.overridden ? {} : { finalType: existing.status === "CONFIRMED" ? existing.finalType : opinion }),
    },
  });
}

async function getOpinion(contractId) {
  await ensureContract(contractId);
  const findings = await prisma.auditFinding.findMany({ where: { contractId } });
  const proposal = determineOpinion(findings);
  const decision = await prisma.opinionDecision.findUnique({ where: { contractId } });
  return {
    proposed: proposal.opinion,
    proposedAr: proposal.opinionAr,
    drivers: proposal.drivers,
    findingsCount: findings.length,
    decision: decision || null,
    effectiveType: (decision && decision.finalType) || proposal.opinion,
  };
}

/** Auditor confirms the proposed opinion or overrides it (logged with reason). */
async function confirmOpinion(contractId, { finalType, reason } = {}, userId) {
  await ensureContract(contractId);
  const findings = await prisma.auditFinding.findMany({ where: { contractId } });
  const proposed = determineOpinion(findings).opinion;
  const chosen = (finalType || proposed || "").toUpperCase();
  if (!OPINION[chosen]) {
    const e = new Error("نوع الرأي غير صالح. القيم: UNQUALIFIED | QUALIFIED | ADVERSE | DISCLAIMER.");
    e.status = 400;
    throw e;
  }
  const overridden = chosen !== proposed;
  if (overridden && !reason) {
    const e = new Error("يجب إدخال سبب عند تجاوز الرأي المقترح (BR-7).");
    e.status = 400;
    throw e;
  }
  const data = {
    proposedType: proposed,
    finalType: chosen,
    status: "CONFIRMED",
    overridden,
    reason: reason ? String(reason) : null,
    confirmedById: userId || null,
    confirmedAt: new Date(),
  };
  return prisma.opinionDecision.upsert({
    where: { contractId },
    create: { contractId, ...data },
    update: data,
  });
}

/** Resolve the opinion type to render on the report: confirmed/overridden wins, else the live proposal. */
async function resolveOpinionType(contractId) {
  const decision = await prisma.opinionDecision.findUnique({ where: { contractId } });
  if (decision && decision.finalType) return decision.finalType;
  const findings = await prisma.auditFinding.findMany({ where: { contractId } });
  if (findings.length) return determineOpinion(findings).opinion;
  return null;
}

module.exports = {
  listFindings,
  createFinding,
  deleteFinding,
  getOpinion,
  confirmOpinion,
  resolveOpinionType,
  OPINION_AR,
};
