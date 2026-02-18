const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");

module.exports = {
  create: async (data) => {
    return prisma.reviewMarkIndexTemplate.create({
      data: {
        codeImage: data.codeImage,
        name: data.name,
        shortDescription: data.shortDescription,
        suggestedStage: data.suggestedStage,
        whenToUse: data.whenToUse,
        exampleShortForm: data.exampleShortForm,
        sectorTags: data.sectorTags,
        assertion: data.assertion,
        benchmark: data.benchmark,
        scoreWeight: data.scoreWeight ? Number(data.scoreWeight) : null,
        severityLevel: data.severityLevel ? Number(data.severityLevel) : null,
        severityWeight: data.severityWeight ? Number(data.severityWeight) : null,
        priorityScore: data.priorityScore ? Number(data.priorityScore) : null,
        priorityRating: data.priorityRating
      }
    });
  },

  getAll: async () => {
    return prisma.reviewMarkIndexTemplate.findMany({ orderBy: { id: 'asc' } });
  },

  update: async (id, data) => {
    return prisma.reviewMarkIndexTemplate.update({ where: { id: Number(id) }, data });
  },

  delete: async (id) => {
    return prisma.reviewMarkIndexTemplate.delete({ where: { id: Number(id) } });
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => {
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
      insertHandler: (row) => prisma.reviewMarkIndexTemplate.create({ data: row })
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async () => {
    const data = await prisma.reviewMarkIndexTemplate.findMany({ orderBy: { id: 'asc' } });

    return exportExcelUtil({
      filePrefix: "review_mark_index_template",
      headers: [
        "Name", "Description", "Stage", "When To Use", "Example",
        "Sector", "Assertion", "Benchmark",
        "Score Weight", "Severity Level", "Severity Weight",
        "Priority Score", "Priority Rating"
      ],
      rows: data.map(i => [
        i.name, i.shortDescription, i.suggestedStage, i.whenToUse, i.exampleShortForm,
        i.sectorTags, i.assertion, i.benchmark, i.scoreWeight, i.severityLevel,
        i.severityWeight, i.priorityScore, i.priorityRating
      ])
    });
  }
};