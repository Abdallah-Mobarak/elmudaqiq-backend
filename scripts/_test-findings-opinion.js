/** Exercise the findings → opinion engine end-to-end (FRD 2.3.3 / 2.3.9). */
const svc = require("../src/services/auditFindings.service");
const prisma = require("../src/config/prisma");

const CID = process.argv[2] || "dae46abe-3c09-4640-9a6e-80ba7b453663";

(async () => {
  // Clean slate
  await prisma.auditFinding.deleteMany({ where: { contractId: CID } });
  await prisma.opinionDecision.deleteMany({ where: { contractId: CID } });

  console.log("0) no findings →", (await svc.getOpinion(CID)).effectiveType, "(expect UNQUALIFIED)");

  // Material misstatement, not pervasive → QUALIFIED
  await svc.createFinding(CID, { analyticalGroup: "ذمم مدينة", problemType: "MISSTATEMENT", material: true, pervasive: false, description: "عدم تكوين مخصص ديون مشكوك فيها 500 ألف" }, 1);
  let op = await svc.getOpinion(CID);
  console.log("1) material misstatement →", op.proposed, "| effective:", op.effectiveType, "(expect QUALIFIED)");

  // Add a pervasive misstatement → ADVERSE (most severe wins)
  await svc.createFinding(CID, { analyticalGroup: "توحيد القوائم", problemType: "MISSTATEMENT", material: true, pervasive: true }, 1);
  op = await svc.getOpinion(CID);
  console.log("2) + pervasive misstatement →", op.proposed, "(expect ADVERSE)");

  // Auditor override to DISCLAIMER with reason
  const dec = await svc.confirmOpinion(CID, { finalType: "DISCLAIMER", reason: "تعذّر الحصول على أدلة كافية" }, 7);
  console.log("3) override →", dec.finalType, "| overridden:", dec.overridden, "| by:", dec.confirmedById);
  console.log("   resolveOpinionType →", await svc.resolveOpinionType(CID), "(expect DISCLAIMER)");

  // Reset so the demo report renders UNQUALIFIED again
  await prisma.auditFinding.deleteMany({ where: { contractId: CID } });
  await prisma.opinionDecision.deleteMany({ where: { contractId: CID } });
  console.log("4) reset → resolveOpinionType:", await svc.resolveOpinionType(CID), "(expect null)");

  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error("ERR:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
