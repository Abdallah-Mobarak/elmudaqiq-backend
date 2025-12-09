const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPDF");


function buildIdFilter(id) {
  if (!id) return null;

  if (typeof id === "string" && id.includes(",")) {
    return {
      in: id.split(",").map(n => Number(n.trim())).filter(n => !isNaN(n))
    };
  }

  const single = Number(id);
  if (!isNaN(single)) return single;

  return null;
}

module.exports = {

  // ---------------- CREATE ----------------
create: async (data) => {
  const item = await prisma.fileStage.create({
    data: {
      stageCode: data.stageCode,
      stage: data.stage,
      entityType: data.entityType,
      economicSector: data.economicSector,
      procedure: data.procedure,
      scopeOfProcedure: data.scopeOfProcedure,
      selectionMethod: data.selectionMethod,
      examplesOfUse: data.examplesOfUse,

      // IMPORTANT: Must match Prisma exactly
      IAS: data.IAS,
      IFRS: data.IFRS,
      ISA: data.ISA,

      relevantPolicies: data.relevantPolicies,

      // Correct Prisma field name
      detailedExplanation: data.detailedExplanation,

      formsToBeCompleted: data.formsToBeCompleted,

      //  Correct Prisma field name
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

  return { message: "File Stage created successfully", item };
},

  // ---------------- GET ALL ----------------
  getAll: async (options = {}) => {
    const { page = 1, limit = 20, search, stageCode, stage, entityType } = options;

    const pageNum = Number(page) >= 1 ? Number(page) : 1;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const skip = (pageNum - 1) * take;

    let where = {};

    if (stageCode) where.stageCode = { contains: stageCode, mode: "insensitive" };
    if (stage) where.stage = { contains: stage, mode: "insensitive" };
    if (entityType) where.entityType = { contains: entityType, mode: "insensitive" };

    if (search) {
      const s = String(search);
      where.OR = [
        { stageCode: { contains: s, mode: "insensitive" } },
        { stage: { contains: s, mode: "insensitive" } },
        { entityType: { contains: s, mode: "insensitive" } },
        { procedure: { contains: s, mode: "insensitive" } },
        { detailedExplanation: { contains: s, mode: "insensitive" } },
      ];
    }

    const total = await prisma.fileStage.count({ where });

    const data = await prisma.fileStage.findMany({
      where,
      skip,
      take,
      orderBy: { id: "desc" },
    });

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: take,
        pages: Math.ceil(total / take),
      },
    };
  },

  // ---------------- GET ONE ----------------
  getOne: async (id) => {
    id = Number(id);
    if (!id) throw { customMessage: "Invalid ID", status: 400 };

    const item = await prisma.fileStage.findUnique({ where: { id } });
    if (!item) throw { customMessage: "File Stage not found", status: 404 };

    return item;
  },

  // ---------------- UPDATE ----------------
  update: async (id, data) => {
    id = Number(id);

    const exists = await prisma.fileStage.findUnique({ where: { id } });
    if (!exists) throw { customMessage: "File Stage not found", status: 404 };

    const updated = await prisma.fileStage.update({
      where: { id },
      data,
    });

    return { message: "File Stage updated", updated };
  },

  // ---------------- DELETE ----------------
  delete: async (id) => {
    id = Number(id);

    const exists = await prisma.fileStage.findUnique({ where: { id } });
    if (!exists) throw { customMessage: "File Stage not found", status: 404 };

    await prisma.fileStage.delete({ where: { id } });

    return { message: "File Stage deleted" };
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
      insertHandler: (row) => prisma.fileStage.create({ data: row }),
    });
  },

// ---------------- EXPORT EXCEL ----------------
exportExcel: async (filters = {}) => {
  let where = {};

  // ✅ MULTI ID SUPPORT
  const idFilter = buildIdFilter(filters.id);
  if (idFilter) where.id = idFilter;

  if (filters.stageCode)
    where.stageCode = { contains: filters.stageCode, mode: "insensitive" };

  if (filters.stage)
    where.stage = { contains: filters.stage, mode: "insensitive" };

  if (filters.search) {
    const s = String(filters.search);
    where.OR = [
      { stageCode: { contains: s, mode: "insensitive" } },
      { stage: { contains: s, mode: "insensitive" } },
      { entityType: { contains: s, mode: "insensitive" } },
      { procedure: { contains: s, mode: "insensitive" } },
    ];
  }

  const data = await prisma.fileStage.findMany({ where });

  return exportExcelUtil({
    filePrefix: "file_stages",
    headers: [
      "Stage Code","Stage","Entity Type","Economic Sector","Procedure","Scope",
      "Selection","Examples","IAS","IFRS","ISA","Policies","Explanation",
      "Forms","Procedures","Risks","Risk Level","Responsible",
      "Outputs","Period","Strengths","Weaknesses","KPIs"
    ],
    rows: data.map(i => [
      i.stageCode,
      i.stage,
      i.entityType,
      i.economicSector,
      i.procedure,
      i.scopeOfProcedure,
      i.selectionMethod,
      i.examplesOfUse,
      i.IAS,
      i.IFRS,
      i.ISA,
      i.relevantPolicies,
      i.detailedExplanation,
      i.formsToBeCompleted,
      i.practicalProcedures,
      i.associatedRisks,
      i.riskLevel,
      i.responsibleAuthority,
      i.outputs,
      i.implementationPeriod,
      i.strengths,
      i.potentialWeaknesses,
      i.performanceIndicators
    ])
  });
},

// ---------------- EXPORT PDF ----------------
exportPDF: async (filters = {}) => {
  let where = {};

  // ✅ MULTI ID SUPPORT
  const idFilter = buildIdFilter(filters.id);
  if (idFilter) where.id = idFilter;

  if (filters.stageCode)
    where.stageCode = { contains: filters.stageCode, mode: "insensitive" };

  if (filters.stage)
    where.stage = { contains: filters.stage, mode: "insensitive" };

  if (filters.search) {
    const s = String(filters.search);
    where.OR = [
      { stageCode: { contains: s, mode: "insensitive" } },
      { stage: { contains: s, mode: "insensitive" } },
      { entityType: { contains: s, mode: "insensitive" } },
      { procedure: { contains: s, mode: "insensitive" } },
    ];
  }

  const data = await prisma.fileStage.findMany({ where });

  return exportPDFUtil({
    title: "File Stages Report",
    filePrefix: "file_stages",
    headers: [
      { label: "Code", width: 70 },
      { label: "Stage", width: 120 },
      { label: "Entity", width: 120 },
      { label: "Procedure", width: 200 },
      { label: "Responsible", width: 120 }
    ],
    rows: data.map(i => [
      i.stageCode,
      i.stage,
      i.entityType,
      i.procedure,
      i.responsibleAuthority
    ])
  });
},

};
