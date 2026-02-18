const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");

module.exports = {
  create: async (data) => {
    return prisma.reviewObjectiveStageTemplate.create({
      data: {
        codesCollected: data.codesCollected,
        numberOfCollectedObjectives: data.numberOfCollectedObjectives,
        ethicalCompliancePercentage: data.ethicalCompliancePercentage,
        professionalPlanningPercentage: data.professionalPlanningPercentage,
        internalControlPercentage: data.internalControlPercentage,
        evidencePercentage: data.evidencePercentage,
        evaluationPercentage: data.evaluationPercentage,
        documentationPercentage: data.documentationPercentage,
        totalRelativeWeight: data.totalRelativeWeight,
        codeOfEthics: data.codeOfEthics,
        policies: data.policies,
        ifrs: data.ifrs,
        ias: data.ias,
        notes: data.notes
      }
    });
  },

  getAll: async () => {
    return prisma.reviewObjectiveStageTemplate.findMany({ orderBy: { id: 'asc' } });
  },

  update: async (id, data) => {
    return prisma.reviewObjectiveStageTemplate.update({ where: { id: Number(id) }, data });
  },

  delete: async (id) => {
    return prisma.reviewObjectiveStageTemplate.delete({ where: { id: Number(id) } });
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => ({
        codesCollected: row.getCell(1)?.value?.toString() || null,
        ethicalCompliancePercentage: Number(row.getCell(3)?.value) || 0,
        professionalPlanningPercentage: Number(row.getCell(4)?.value) || 0,
        internalControlPercentage: Number(row.getCell(5)?.value) || 0,
        evidencePercentage: Number(row.getCell(6)?.value) || 0,
        evaluationPercentage: Number(row.getCell(7)?.value) || 0,
        documentationPercentage: Number(row.getCell(8)?.value) || 0,
        codeOfEthics: row.getCell(13)?.value?.toString() || null,
        policies: row.getCell(14)?.value?.toString() || null,
        ifrs: row.getCell(15)?.value?.toString() || null,
        ias: row.getCell(16)?.value?.toString() || null,
        notes: row.getCell(17)?.value?.toString() || null
      }),
      insertHandler: async (r) => {
        const codes = r.codesCollected?.split(",") || [];
        const totalRelativeWeight =
          r.ethicalCompliancePercentage +
          r.professionalPlanningPercentage +
          r.internalControlPercentage +
          r.evidencePercentage +
          r.evaluationPercentage +
          r.documentationPercentage;

        return prisma.reviewObjectiveStageTemplate.create({
          data: { ...r, numberOfCollectedObjectives: codes.length, totalRelativeWeight }
        });
      }
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async () => {
    const data = await prisma.reviewObjectiveStageTemplate.findMany({ orderBy: { id: 'asc' } });

    return exportExcelUtil({
      filePrefix: "review_objective_stages_template",
      headers: [
        "Codes", "Count", "Ethical %", "Planning %", "IC %",
        "Evidence %", "Evaluation %", "Documentation %",
        "Total", "Ethics", "Policies", "IFRS", "IAS", "Notes"
      ],
      rows: data.map(i => [
        i.codesCollected, i.numberOfCollectedObjectives, i.ethicalCompliancePercentage,
        i.professionalPlanningPercentage, i.internalControlPercentage, i.evidencePercentage,
        i.evaluationPercentage, i.documentationPercentage, i.totalRelativeWeight,
        i.codeOfEthics, i.policies, i.ifrs, i.ias, i.notes
      ])
    });
  }
};