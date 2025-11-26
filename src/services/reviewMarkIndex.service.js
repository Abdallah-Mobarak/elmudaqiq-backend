const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");

if (!fs.existsSync("exports")) fs.mkdirSync("exports");

module.exports = {

  // --------------------------------------------------
  // ✅ CREATE (مع حساب Priority Score)
  // --------------------------------------------------
  create: async (data) => {
    const scoreWeight = data.scoreWeight ? Number(data.scoreWeight) : null;
    const severityWeight = data.severityWeight ? Number(data.severityWeight) : null;

    let priorityScore = null;
    if (scoreWeight !== null && severityWeight !== null) {
      priorityScore = scoreWeight * severityWeight;
    }

    const item = await prisma.reviewMarkIndex.create({
      data: {
        ...data,
        scoreWeight,
        severityWeight,
        priorityScore
      }
    });

    return { message: "Review Mark Index created", item };
  },

  // --------------------------------------------------
  // ✅ GET ALL + FILTER + SEARCH
  // --------------------------------------------------
  getAll: async (filters = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      suggestedStage,
      sectorTags,
      severityLevel
    } = filters;

    const where = {};

    if (suggestedStage)
      where.suggestedStage = { contains: suggestedStage, mode: "insensitive" };

    if (sectorTags)
      where.sectorTags = { contains: sectorTags, mode: "insensitive" };

    if (severityLevel)
      where.severityLevel = Number(severityLevel);

    if (search) {
      const s = String(search);
      where.OR = [
        { code: { contains: s, mode: "insensitive" } },
        { name: { contains: s, mode: "insensitive" } },
        { shortDescription: { contains: s, mode: "insensitive" } },
        { assertion: { contains: s, mode: "insensitive" } },
        { benchmark: { contains: s, mode: "insensitive" } }
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
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  },

  // --------------------------------------------------
  // ✅ GET ONE
  // --------------------------------------------------
  getOne: async (id) => {
    const numericID = Number(id);

    const item = await prisma.reviewMarkIndex.findUnique({
      where: { id: numericID }
    });

    if (!item) throw { customMessage: "Review Mark not found", status: 404 };

    return item;
  },

  // --------------------------------------------------
  // ✅ UPDATE (مع إعادة حساب Priority Score)
  // --------------------------------------------------
  update: async (id, data) => {
    const numericID = Number(id);

    const exists = await prisma.reviewMarkIndex.findUnique({
      where: { id: numericID }
    });

    if (!exists) throw { customMessage: "Review Mark not found", status: 404 };

    const scoreWeight =
      data.scoreWeight !== undefined ? Number(data.scoreWeight) : exists.scoreWeight;

    const severityWeight =
      data.severityWeight !== undefined
        ? Number(data.severityWeight)
        : exists.severityWeight;

    let priorityScore = exists.priorityScore;

    if (scoreWeight !== null && severityWeight !== null) {
      priorityScore = scoreWeight * severityWeight;
    }

    const updated = await prisma.reviewMarkIndex.update({
      where: { id: numericID },
      data: {
        ...data,
        scoreWeight,
        severityWeight,
        priorityScore
      }
    });

    return { message: "Updated successfully", updated };
  },

  // --------------------------------------------------
  // ✅ DELETE
  // --------------------------------------------------
  delete: async (id) => {
    const numericID = Number(id);

    const exists = await prisma.reviewMarkIndex.findUnique({
      where: { id: numericID }
    });

    if (!exists) throw { customMessage: "Review Mark not found", status: 404 };

    await prisma.reviewMarkIndex.delete({ where: { id: numericID } });

    return { message: "Deleted successfully" };
  },

  // --------------------------------------------------
  // ✅ IMPORT EXCEL
  // --------------------------------------------------
  importExcel: async (file) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const sheet = workbook.worksheets[0];
    let imported = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const scoreWeight = Number(row.getCell(10).value) || null;
      const severityWeight = Number(row.getCell(12).value) || null;

      let priorityScore = null;
      if (scoreWeight !== null && severityWeight !== null) {
        priorityScore = scoreWeight * severityWeight;
      }

      prisma.reviewMarkIndex.create({
        data: {
          code: row.getCell(1).value?.toString().trim(),
          name: row.getCell(2).value?.toString().trim(),
          shortDescription: row.getCell(3).value?.toString().trim(),
          suggestedStage: row.getCell(4).value?.toString().trim(),
          whenToUse: row.getCell(5).value?.toString().trim(),
          exampleShortForm: row.getCell(6).value?.toString().trim(),
          sectorTags: row.getCell(7).value?.toString().trim(),
          assertion: row.getCell(8).value?.toString().trim(),
          benchmark: row.getCell(9).value?.toString().trim(),
          scoreWeight,
          severityLevel: Number(row.getCell(11).value) || null,
          severityWeight,
          priorityScore,
          priorityRating: row.getCell(13).value?.toString().trim()
        }
      });

      imported++;
    });

    return { message: "Import completed", imported };
  },

  // --------------------------------------------------
  // ✅ EXPORT EXCEL (ALL + ONE)
  // --------------------------------------------------
  exportExcel: async (filters = {}, id = null) => {
    const hasID = id !== null && id !== undefined && id !== "";

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Review Marks Index");

    sheet.addRow([
      "Code", "Name", "Short Description", "Suggested Stage", "When To Use",
      "Example Short Form", "Sector/Tags", "Assertion", "Benchmark",
      "Score Weight", "Severity Level", "Severity Weight",
      "Priority Score", "Priority Rating"
    ]);

    let data;

    if (hasID) {
      const numericID = Number(id);
      const item = await prisma.reviewMarkIndex.findUnique({
        where: { id: numericID }
      });

      if (!item) throw { customMessage: "Not found", status: 404 };

      data = [item];
    } else {
      data = await prisma.reviewMarkIndex.findMany({ orderBy: { id: "asc" } });
    }

    data.forEach((item) => {
      sheet.addRow([
        item.code,
        item.name,
        item.shortDescription,
        item.suggestedStage,
        item.whenToUse,
        item.exampleShortForm,
        item.sectorTags,
        item.assertion,
        item.benchmark,
        item.scoreWeight,
        item.severityLevel,
        item.severityWeight,
        item.priorityScore,
        item.priorityRating
      ]);
    });

    sheet.columns.forEach((col) => {
      let maxLen = 15;
      col.eachCell({ includeEmpty: true }, (cell) => {
        maxLen = Math.max(maxLen, (cell.value + "").length + 2);
      });
      col.width = maxLen;
    });

    const filePath = `exports/reviewMarks_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return { filePath };
  },

  // --------------------------------------------------
  // ✅ EXPORT PDF
  // --------------------------------------------------
  exportPDF: async () => {
    const items = await prisma.reviewMarkIndex.findMany({
      orderBy: { id: "asc" }
    });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filePath = `exports/reviewMarks_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.font("Helvetica-Bold").fontSize(18).text("AL MUDAQIQ");
    doc.moveDown(1);
    doc.font("Helvetica").fontSize(14).text("Review Marks Index Report", {
      align: "center"
    });
    doc.moveDown(2);

    items.forEach((item) => {
      doc.fontSize(10).text(
        `${item.code || ""} | ${item.name || ""} | ${item.priorityScore || ""}`
      );
      doc.moveDown(0.5);
    });

    doc.end();

    return { filePath, stream };
  }
};
