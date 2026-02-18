const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");

module.exports = {
  create: async (data) => {
    return prisma.reviewGuideTemplate.create({
      data: {
        level: data.level,
        separator: data.separator,
        number: data.number,
        statement: data.statement,
        purpose: data.purpose,
        responsiblePerson: data.responsiblePerson,
        datePrepared: data.datePrepared ? new Date(data.datePrepared) : null,
        dateReviewed: data.dateReviewed ? new Date(data.dateReviewed) : null,
        conclusion: data.conclusion,
        attachments: data.attachments,
        notes1: data.notes1,
        notes2: data.notes2,
        notes3: data.notes3
      }
    });
  },

  getAll: async () => {
    return prisma.reviewGuideTemplate.findMany({ orderBy: { id: 'asc' } });
  },

  update: async (id, data) => {
    return prisma.reviewGuideTemplate.update({ where: { id: Number(id) }, data });
  },

  delete: async (id) => {
    return prisma.reviewGuideTemplate.delete({ where: { id: Number(id) } });
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => ({
        level: row.getCell(2)?.value?.toString().trim() || null,
        separator: row.getCell(3)?.value?.toString().trim() || null,
        number: row.getCell(4)?.value?.toString().trim() || null,
        statement: row.getCell(5)?.value?.toString().trim() || null,
        purpose: row.getCell(6)?.value?.toString().trim() || null,
        responsiblePerson: row.getCell(7)?.value?.toString().trim() || null,
        datePrepared: row.getCell(8)?.value ? new Date(row.getCell(8).value) : null,
        dateReviewed: row.getCell(9)?.value ? new Date(row.getCell(9).value) : null,
        conclusion: row.getCell(10)?.value?.toString().trim() || null,
        attachments: row.getCell(11)?.value?.toString().trim() || null,
        notes1: row.getCell(12)?.value?.toString().trim() || null,
        notes2: row.getCell(13)?.value?.toString().trim() || null,
        notes3: row.getCell(14)?.value?.toString().trim() || null,
      }),
      insertHandler: (row) => prisma.reviewGuideTemplate.create({ data: row })
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async () => {
    const data = await prisma.reviewGuideTemplate.findMany({ orderBy: { id: 'asc' } });

    return exportExcelUtil({
      headers: [
        "ID", "Level", "Separator", "Number", "Statement", "Purpose",
        "Responsible Person", "Date Prepared", "Date Reviewed",
        "Conclusion", "Attachments", "Notes 1", "Notes 2", "Notes 3"
      ],
      rows: data.map(i => [
        i.id, i.level, i.separator, i.number, i.statement, i.purpose,
        i.responsiblePerson, i.datePrepared, i.dateReviewed,
        i.conclusion, i.attachments, i.notes1, i.notes2, i.notes3
      ]),
      filePrefix: "review_guide_template"
    });
  }
};