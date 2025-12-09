const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPDF");

//  Helper for Multi ID
function buildIdFilter(id) {
  if (!id) return null;
  if (typeof id === "string" && id.includes(",")) {
    return { in: id.split(",").map(n => Number(n.trim())).filter(n => !isNaN(n)) };
  }
  const single = Number(id);
  if (!isNaN(single)) return single;
  return null;
}

module.exports = {

  // ---------------- CREATE ----------------
  create: async (data) => {
    let numberOfCollectedObjectives = null;

    if (data.codesCollected) {
      const codes = data.codesCollected.split(",").map(c => c.trim()).filter(Boolean);
      numberOfCollectedObjectives = codes.length;
    }

    const percentages = [
      data.ethicalCompliancePercentage,
      data.professionalPlanningPercentage,
      data.internalControlPercentage,
      data.evidencePercentage,
      data.evaluationPercentage,
      data.documentationPercentage
    ];

    const totalRelativeWeight = percentages
      .map(p => Number(p) || 0)
      .reduce((a, b) => a + b, 0);

    let gapPercentage = null;
    if (data.actualPerformance !== undefined && data.actualPerformance !== null) {
      gapPercentage = totalRelativeWeight - Number(data.actualPerformance);
    }

    const item = await prisma.reviewObjectiveStage.create({
      data: {
        ...data,
        numberOfCollectedObjectives,
        totalRelativeWeight,
        gapPercentage
      }
    });

    return { message: "Review Objective Stage created", item };
  },

  // ---------------- GET ALL ----------------
  getAll: async (filters = {}) => {
    const { page = 1, limit = 20, search, implementationStatus, codesCollected } = filters;

    const where = {};

    if (implementationStatus)
      where.implementationStatus = { contains: implementationStatus, mode: "insensitive" };

    if (codesCollected)
      where.codesCollected = { contains: codesCollected, mode: "insensitive" };

    if (search) {
      const s = String(search);
      where.OR = [
        { codesCollected: { contains: s, mode: "insensitive" } },
        { implementationStatus: { contains: s, mode: "insensitive" } },
        { codeOfEthics: { contains: s, mode: "insensitive" } },
        { policies: { contains: s, mode: "insensitive" } },
        { ifrs: { contains: s, mode: "insensitive" } },
        { ias: { contains: s, mode: "insensitive" } },
        { notes: { contains: s, mode: "insensitive" } }
      ];
    }

    const total = await prisma.reviewObjectiveStage.count({ where });

    const data = await prisma.reviewObjectiveStage.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { id: "asc" }
    });

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
    };
  },

  // ---------------- GET ONE ----------------
  getOne: async (id) => {
    const item = await prisma.reviewObjectiveStage.findUnique({ where: { id: Number(id) } });
    if (!item) throw { customMessage: "Record not found", status: 404 };
    return item;
  },

  // ---------------- UPDATE ----------------
  update: async (id, data) => {
    const exists = await prisma.reviewObjectiveStage.findUnique({ where: { id: Number(id) } });
    if (!exists) throw { customMessage: "Record not found", status: 404 };

    let numberOfCollectedObjectives = exists.numberOfCollectedObjectives;
    if (data.codesCollected) {
      const codes = data.codesCollected.split(",").map(c => c.trim()).filter(Boolean);
      numberOfCollectedObjectives = codes.length;
    }

    const percentages = [
      data.ethicalCompliancePercentage ?? exists.ethicalCompliancePercentage,
      data.professionalPlanningPercentage ?? exists.professionalPlanningPercentage,
      data.internalControlPercentage ?? exists.internalControlPercentage,
      data.evidencePercentage ?? exists.evidencePercentage,
      data.evaluationPercentage ?? exists.evaluationPercentage,
      data.documentationPercentage ?? exists.documentationPercentage
    ];

    const totalRelativeWeight = percentages.map(p => Number(p) || 0).reduce((a, b) => a + b, 0);

    const actualPerf = data.actualPerformance ?? exists.actualPerformance;
    const gapPercentage =
      actualPerf !== null && actualPerf !== undefined
        ? totalRelativeWeight - Number(actualPerf)
        : exists.gapPercentage;

    const updated = await prisma.reviewObjectiveStage.update({
      where: { id: Number(id) },
      data: { ...data, numberOfCollectedObjectives, totalRelativeWeight, gapPercentage }
    });

    return { message: "Updated successfully", updated };
  },

  // ---------------- DELETE ----------------
  delete: async (id) => {
    await prisma.reviewObjectiveStage.delete({ where: { id: Number(id) } });
    return { message: "Deleted successfully" };
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => ({
        codesCollected: row.getCell(1).value,
        ethicalCompliancePercentage: Number(row.getCell(2).value) || 0,
        professionalPlanningPercentage: Number(row.getCell(3).value) || 0,
        internalControlPercentage: Number(row.getCell(4).value) || 0,
        evidencePercentage: Number(row.getCell(5).value) || 0,
        evaluationPercentage: Number(row.getCell(6).value) || 0,
        documentationPercentage: Number(row.getCell(7).value) || 0,
        implementationStatus: row.getCell(8).value,
        actualPerformance: Number(row.getCell(9).value) || 0,
        codeOfEthics: row.getCell(10).value,
        policies: row.getCell(11).value,
        ifrs: row.getCell(12).value,
        ias: row.getCell(13).value,
        notes: row.getCell(14).value
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

        const gapPercentage = totalRelativeWeight - r.actualPerformance;

        return prisma.reviewObjectiveStage.create({
          data: {
            ...r,
            numberOfCollectedObjectives: codes.length,
            totalRelativeWeight,
            gapPercentage
          }
        });
      }
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async (filters = {}) => {
    const where = {};
    const idFilter = buildIdFilter(filters.id);
    if (idFilter) where.id = idFilter;

    const data = await prisma.reviewObjectiveStage.findMany({ where });

    return exportExcelUtil({
      filePrefix: "review_objective_stages",
      headers: [
        "Codes", "Count", "Ethical %", "Planning %", "IC %",
        "Evidence %", "Evaluation %", "Documentation %",
        "Total", "Status", "Actual", "Gap", "Ethics",
        "Policies", "IFRS", "IAS", "Notes"
      ],
      rows: data.map(i => [
        i.codesCollected,
        i.numberOfCollectedObjectives,
        i.ethicalCompliancePercentage,
        i.professionalPlanningPercentage,
        i.internalControlPercentage,
        i.evidencePercentage,
        i.evaluationPercentage,
        i.documentationPercentage,
        i.totalRelativeWeight,
        i.implementationStatus,
        i.actualPerformance,
        i.gapPercentage,
        i.codeOfEthics,
        i.policies,
        i.ifrs,
        i.ias,
        i.notes
      ])
    });
  },

  // ---------------- EXPORT PDF ----------------
  exportPDF: async (filters = {}) => {
    const where = {};
    const idFilter = buildIdFilter(filters.id);
    if (idFilter) where.id = idFilter;

    const data = await prisma.reviewObjectiveStage.findMany({ where });

    return exportPDFUtil({
      title: "Review Objective Stages Report",
      filePrefix: "review_objective_stages",
      headers: [
        { label: "Codes", width: 80 },
        { label: "Count", width: 50 },
        { label: "Total", width: 70 },
        { label: "Status", width: 120 },
        { label: "Gap", width: 70 }
      ],
      rows: data.map(i => [
        i.codesCollected,
        i.numberOfCollectedObjectives,
        i.totalRelativeWeight,
        i.implementationStatus,
        i.gapPercentage
      ])
    });
  }

};
