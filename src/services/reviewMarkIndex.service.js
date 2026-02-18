const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPdf");

// ✅ Helper for Multi ID
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
  create: async (data, subscriberId) => {
    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

    const scoreWeight = data.scoreWeight !== undefined ? Number(data.scoreWeight) : null;
    const severityWeight = data.severityWeight !== undefined ? Number(data.severityWeight) : null;

    let priorityScore = null;
    if (scoreWeight !== null && severityWeight !== null) {
      priorityScore = scoreWeight * severityWeight;
    }

    const item = await prisma.reviewMarkIndex.create({
      data: {
        ...data,
        subscriberId: Number(subscriberId),
        scoreWeight,
        severityWeight,
        priorityScore
      }
    });

    return { message: "Review Mark Index created", item };
  },

  // ---------------- GET ALL ----------------
  getAll: async (filters = {}, subscriberId) => {
    const { page = 1, limit = 20, search, suggestedStage, sectorTags, severityLevel } = filters;

    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

    const where = {
      subscriberId: Number(subscriberId)
    };

    if (suggestedStage)
      where.suggestedStage = { contains: suggestedStage,  };

    if (sectorTags)
      where.sectorTags = { contains: sectorTags,  };

    if (severityLevel)
      where.severityLevel = Number(severityLevel);

    if (search) {
      const s = String(search);
      where.OR = [
        { name: { contains: s, } },
        { shortDescription: { contains: s,  } },
        { assertion: { contains: s, } },
        { benchmark: { contains: s, } }
      ];
    }

    const total = await prisma.reviewMarkIndex.count({ where });

    const data = await prisma.reviewMarkIndex.findMany({
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
    const item = await prisma.reviewMarkIndex.findUnique({ where: { id: Number(id) } });
    if (!item) throw { customMessage: "Review Mark not found", status: 404 };
    return item;
  },

  // ---------------- UPDATE ----------------
  update: async (id, data, subscriberId) => {
    const exists = await prisma.reviewMarkIndex.findFirst({
      where: { 
        id: Number(id),
        subscriberId: Number(subscriberId)
      }
    });
    if (!exists) throw { customMessage: "Review Mark not found", status: 404 };

    const scoreWeight =
      data.scoreWeight !== undefined ? Number(data.scoreWeight) : exists.scoreWeight;

    const severityWeight =
      data.severityWeight !== undefined ? Number(data.severityWeight) : exists.severityWeight;

    let priorityScore = exists.priorityScore;
    if (scoreWeight !== null && severityWeight !== null) {
      priorityScore = scoreWeight * severityWeight;
    }

    const updated = await prisma.reviewMarkIndex.update({
      where: { id: Number(id) },
      data: { ...data, scoreWeight, severityWeight, priorityScore }
    });

    return { message: "Updated successfully", updated };
  },

  // ---------------- DELETE ----------------
  delete: async (id, subscriberId) => {
    const exists = await prisma.reviewMarkIndex.findFirst({
      where: { 
        id: Number(id),
        subscriberId: Number(subscriberId)
      }
    });
    if (!exists) throw { customMessage: "Review Mark not found", status: 404 };

    await prisma.reviewMarkIndex.delete({ where: { id: Number(id) } });
    return { message: "Deleted successfully" };
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file, subscriberId) => {
    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => {
        // Excel columns order: Name, Description, Stage, When To Use, Example, Sector, Assertion, Benchmark, Score Weight, Severity Level, Severity Weight, Priority Score, Priority Rating
        const scoreWeight = Number(row.getCell(9)?.value) || null;
        const severityWeight = Number(row.getCell(11)?.value) || null;

        let priorityScore = null;
        if (scoreWeight !== null && severityWeight !== null) {
          priorityScore = scoreWeight * severityWeight;
        }

        return {
          name: row.getCell(1)?.value?.toString() || null,
          shortDescription: row.getCell(2)?.value?.toString() || null,
          suggestedStage: row.getCell(3)?.value?.toString() || null,
          whenToUse: row.getCell(4)?.value?.toString() || null,
          exampleShortForm: row.getCell(5)?.value?.toString() || null,
          sectorTags: row.getCell(6)?.value?.toString() || null,
          assertion: row.getCell(7)?.value?.toString() || null,
          benchmark: row.getCell(8)?.value?.toString() || null,
          scoreWeight,
          severityLevel: Number(row.getCell(10)?.value) || null,
          severityWeight,
          priorityScore,
          priorityRating: row.getCell(13)?.value?.toString() || null
        };
      },

      insertHandler: (row) => prisma.reviewMarkIndex.create({ data: { ...row, subscriberId: Number(subscriberId) } })
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async (filters = {}, subscriberId) => {
    const where = {
      subscriberId: Number(subscriberId)
    };
    const idFilter = buildIdFilter(filters.id);
    if (idFilter) where.id = idFilter;

    const data = await prisma.reviewMarkIndex.findMany({ where });

    return exportExcelUtil({
      filePrefix: "review_mark_index",
      headers: [
        "Name", "Description", "Stage", "When To Use", "Example",
        "Sector", "Assertion", "Benchmark",
        "Score Weight", "Severity Level", "Severity Weight",
        "Priority Score", "Priority Rating"
      ],
      rows: data.map(i => [
        i.name,
        i.shortDescription,
        i.suggestedStage,
        i.whenToUse,
        i.exampleShortForm,
        i.sectorTags,
        i.assertion,
        i.benchmark,
        i.scoreWeight,
        i.severityLevel,
        i.severityWeight,
        i.priorityScore,
        i.priorityRating
      ])
    });
  },

  // ---------------- EXPORT PDF ----------------
  exportPDF: async (filters = {}, subscriberId) => {
    const where = {
      subscriberId: Number(subscriberId)
    };
    const idFilter = buildIdFilter(filters.id);
    if (idFilter) where.id = idFilter;

    const data = await prisma.reviewMarkIndex.findMany({ where });

    return exportPDFUtil({
      title: "Review Mark Index Report",
      filePrefix: "review_mark_index",
      headers: [
        { label: "Name", width: 140 },
        { label: "Stage", width: 100 },
        { label: "Score", width: 80 },
        { label: "Severity", width: 80 },
        { label: "Priority", width: 80 }
      ],
      rows: data.map(i => [
        i.name,
        i.suggestedStage,
        i.scoreWeight,
        i.severityWeight,
        i.priorityScore
      ])
    });
  }

};
