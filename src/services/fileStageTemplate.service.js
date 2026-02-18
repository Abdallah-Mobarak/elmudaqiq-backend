const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");

module.exports = {
  create: async (data) => {
    return prisma.fileStageTemplate.create({
      data: {
        stageCode: data.stageCode,
        stage: data.stage,
        entityType: data.entityType,
        economicSector: data.economicSector,
        procedure: data.procedure,
        scopeOfProcedure: data.scopeOfProcedure,
        selectionMethod: data.selectionMethod,
        examplesOfUse: data.examplesOfUse,
        IAS: data.IAS,
        IFRS: data.IFRS,
        ISA: data.ISA,
        relevantPolicies: data.relevantPolicies,
        detailedExplanation: data.detailedExplanation,
        formsToBeCompleted: data.formsToBeCompleted,
        practicalProcedures: data.practicalProcedures,
        associatedRisks: data.associatedRisks,
        riskLevel: data.riskLevel,
        responsibleAuthority: data.responsibleAuthority,
        outputs: data.outputs,
        implementationPeriod: data.implementationPeriod,
        strengths: data.strengths,
        potentialWeaknesses: data.potentialWeaknesses,
        performanceIndicators: data.performanceIndicators
      }
    });
  },

  getAll: async () => {
    return prisma.fileStageTemplate.findMany({ orderBy: { id: 'asc' } });
  },

  update: async (id, data) => {
    return prisma.fileStageTemplate.update({ where: { id: Number(id) }, data });
  },

  delete: async (id) => {
    return prisma.fileStageTemplate.delete({ where: { id: Number(id) } });
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => ({
        stageCode: row.getCell(1).value?.toString().trim() || "",
        stage: row.getCell(2).value?.toString().trim() || "",
        entityType: row.getCell(3).value?.toString().trim() || "",
        economicSector: row.getCell(4).value?.toString().trim() || "",
        procedure: row.getCell(5).value?.toString().trim() || "",
        scopeOfProcedure: row.getCell(6).value?.toString().trim() || "",
        selectionMethod: row.getCell(7).value?.toString().trim() || "",
        examplesOfUse: row.getCell(8).value?.toString().trim() || "",
        IAS: row.getCell(9).value?.toString().trim() || "",
        IFRS: row.getCell(10).value?.toString().trim() || "",
        ISA: row.getCell(11).value?.toString().trim() || "",
        relevantPolicies: row.getCell(12).value?.toString().trim() || "",
        detailedExplanation: row.getCell(13).value?.toString().trim() || "",
        formsToBeCompleted: row.getCell(14).value?.toString().trim() || "",
        practicalProcedures: row.getCell(15).value?.toString().trim() || "",
        associatedRisks: row.getCell(16).value?.toString().trim() || "",
        riskLevel: row.getCell(17).value?.toString().trim() || "",
        responsibleAuthority: row.getCell(18).value?.toString().trim() || "",
        outputs: row.getCell(19).value?.toString().trim() || "",
        implementationPeriod: row.getCell(20).value?.toString().trim() || "",
        strengths: row.getCell(21).value?.toString().trim() || "",
        potentialWeaknesses: row.getCell(22).value?.toString().trim() || "",
        performanceIndicators: row.getCell(23).value?.toString().trim() || "",
      }),
      insertHandler: (row) => prisma.fileStageTemplate.create({ data: row }),
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async () => {
    const data = await prisma.fileStageTemplate.findMany({ orderBy: { id: 'asc' } });

    return exportExcelUtil({
      filePrefix: "file_stages_template",
      headers: [
        "Stage Code","Stage","Entity Type","Economic Sector","Procedure","Scope",
        "Selection","Examples","IAS","IFRS","ISA","Policies","Explanation",
        "Forms","Procedures","Risks","Risk Level","Responsible",
        "Outputs","Period","Strengths","Weaknesses","KPIs"
      ],
      rows: data.map(i => [
        i.stageCode, i.stage, i.entityType, i.economicSector, i.procedure, i.scopeOfProcedure,
        i.selectionMethod, i.examplesOfUse, i.IAS, i.IFRS, i.ISA, i.relevantPolicies, i.detailedExplanation,
        i.formsToBeCompleted, i.practicalProcedures, i.associatedRisks, i.riskLevel, i.responsibleAuthority,
        i.outputs, i.implementationPeriod, i.strengths, i.potentialWeaknesses, i.performanceIndicators
      ])
    });
  }
};