/**
 * Audit Opinion auto-determination (FRD 2.3.9 — Table D).
 *
 * Maps the working-paper findings to an opinion type using three dimensions:
 *   - problemType: MISSTATEMENT | SCOPE   (تحريف / قيد نطاق)
 *   - material:    boolean                 (جوهري / غير جوهري)
 *   - pervasive:   boolean                 (شامل / غير شامل)
 *
 * Table D:
 *   none / immaterial .................................. UNQUALIFIED (مطلق)
 *   material + not pervasive (either type) ............. QUALIFIED   (متحفظ)
 *   material + pervasive + misstatement ................ ADVERSE     (سلبي)
 *   material + pervasive + scope limitation ............ DISCLAIMER  (امتناع)
 *
 * The auditor may override the proposed opinion; the override should be logged
 * by the caller (FRD BR-7).
 */

const OPINION = {
  UNQUALIFIED: "UNQUALIFIED",
  QUALIFIED: "QUALIFIED",
  ADVERSE: "ADVERSE",
  DISCLAIMER: "DISCLAIMER",
};

const OPINION_AR = {
  UNQUALIFIED: "رأي مطلق",
  QUALIFIED: "رأي متحفظ",
  ADVERSE: "رأي سلبي",
  DISCLAIMER: "عدم إبداء الرأي",
};

// Severity ranking so multiple findings resolve to the most severe opinion.
const RANK = { UNQUALIFIED: 0, QUALIFIED: 1, ADVERSE: 2, DISCLAIMER: 3 };

/** Opinion for a single finding (already known material). */
function opinionForFinding(finding) {
  const scope = finding.problemType === "SCOPE";
  if (finding.pervasive) return scope ? OPINION.DISCLAIMER : OPINION.ADVERSE;
  return OPINION.QUALIFIED;
}

/**
 * Determine the proposed opinion from a list of findings.
 * @param {Array<{problemType:'MISSTATEMENT'|'SCOPE', material:boolean, pervasive:boolean}>} findings
 * @returns {{ opinion:string, opinionAr:string, drivers:Array }}
 */
function determineOpinion(findings = []) {
  let opinion = OPINION.UNQUALIFIED;
  const drivers = [];

  for (const f of findings || []) {
    if (!f || !f.material) continue; // immaterial findings don't modify the opinion
    const candidate = opinionForFinding(f);
    drivers.push({ ...f, opinion: candidate });
    if (RANK[candidate] > RANK[opinion]) opinion = candidate;
  }

  return { opinion, opinionAr: OPINION_AR[opinion], drivers };
}

module.exports = { OPINION, OPINION_AR, determineOpinion, opinionForFinding };
