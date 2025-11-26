const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");

// Ensure exports directory exists
if (!fs.existsSync("exports")) fs.mkdirSync("exports");

module.exports = {

  // ---------------- CREATE ---------------- //
  // ---------------- CREATE ---------------- //
create: async (data) => {
  const item = await prisma.reviewObjective.create({
    data: {
      objectiveCode: data.objectiveCode,
      objectiveDescription: data.objectiveDescription,
      objectiveCategory: data.objectiveCategory,
      relatedProcedures: data.relatedProcedures,
      expectedOutput: data.expectedOutput,
      risks: data.risks,
      riskLevel: data.riskLevel,
      controlMeasures: data.controlMeasures,
      indicators: data.indicators,
      referenceStandards: data.referenceStandards,
      notes: data.notes,
    }
  });

  return { message: "Review Objective created", item };
},


  // ---------------- GET ALL + SEARCH ---------------- //
  getAll: async (filters = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      objectiveCode,
      category,
      riskLevel
    } = filters;

    const where = {};

    if (objectiveCode) where.objectiveCode = { contains: objectiveCode, mode: "insensitive" };
    if (category) where.category = { contains: category, mode: "insensitive" };
    if (riskLevel) where.riskLevel = { contains: riskLevel, mode: "insensitive" };

    if (search) {
      const s = String(search);
      where.OR = [
        { objectiveCode: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
        { category: { contains: s, mode: "insensitive" } },
        { relatedProcedures: { contains: s, mode: "insensitive" } },
        { expectedOutput: { contains: s, mode: "insensitive" } },
        { risks: { contains: s, mode: "insensitive" } },
        { indicators: { contains: s, mode: "insensitive" } },
        { referenceStandards: { contains: s, mode: "insensitive" } },
        { notes: { contains: s, mode: "insensitive" } }
      ];
    }

    const total = await prisma.reviewObjective.count({ where });

    const data = await prisma.reviewObjective.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { id: "asc" }
    });

    return {
      data,
      meta: { total, page, limit: Number(limit), pages: Math.ceil(total / limit) }
    };
  },

  // ---------------- GET ONE ---------------- //
  getOne: async (id) => {
    const numericID = Number(id);
    const item = await prisma.reviewObjective.findUnique({ where: { id: numericID } });

    if (!item) throw { customMessage: "Review Objective not found", status: 404 };

    return item;
  },

  // ---------------- UPDATE ---------------- //
  update: async (id, data) => {
    const numericID = Number(id);

    const exists = await prisma.reviewObjective.findUnique({ where: { id: numericID } });
    if (!exists) throw { customMessage: "Review Objective not found", status: 404 };

    const updated = await prisma.reviewObjective.update({
      where: { id: numericID },
      data
    });

    return { message: "Updated successfully", updated };
  },

  // ---------------- DELETE ---------------- //
  delete: async (id) => {
    const numericID = Number(id);

    const exists = await prisma.reviewObjective.findUnique({ where: { id: numericID } });
    if (!exists) throw { customMessage: "Review Objective not found", status: 404 };

    await prisma.reviewObjective.delete({ where: { id: numericID } });

    return { message: "Deleted successfully" };
  },

  // ---------------- IMPORT EXCEL ---------------- //
  importExcel: async (file) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const sheet = workbook.worksheets[0];
    const rows = [];
    let imported = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      rows.push({
        objectiveCode: row.getCell(1).value?.toString().trim(),
        description: row.getCell(2).value?.toString().trim(),
        category: row.getCell(3).value?.toString().trim(),
        relatedProcedures: row.getCell(4).value?.toString().trim(),
        expectedOutput: row.getCell(5).value?.toString().trim(),
        risks: row.getCell(6).value?.toString().trim(),
        riskLevel: row.getCell(7).value?.toString().trim(),
        controlMeasures: row.getCell(8).value?.toString().trim(),
        indicators: row.getCell(9).value?.toString().trim(),
        referenceStandards: row.getCell(10).value?.toString().trim(),
        notes: row.getCell(11).value?.toString().trim()
      });
    });

    for (const r of rows) {
      await prisma.reviewObjective.create({ data: r });
      imported++;
    }

    return { message: "Import completed", imported };
  },

  // ---------------- EXPORT (ALL + ONE) EXCEL ---------------- //
  exportExcel: async (filters = {}, id = null) => {
    const hasID = id !== null && id !== undefined && id !== "";

    if (hasID) {
      // EXPORT ONE
      const numericID = Number(id);
      const item = await prisma.reviewObjective.findUnique({ where: { id: numericID } });
      if (!item) throw { customMessage: "Not found", status: 404 };

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Review Objective");

      sheet.addRow([
        "Objective Code", "Description", "Category", "Related Procedures",
        "Expected Output", "Risks", "Risk Level", "Control Measures",
        "Indicators", "Reference Standards", "Notes"
      ]);

      sheet.addRow([
        item.objectiveCode,
        item.description,
        item.category,
        item.relatedProcedures,
        item.expectedOutput,
        item.risks,
        item.riskLevel,
        item.controlMeasures,
        item.indicators,
        item.referenceStandards,
        item.notes
      ]);

      sheet.columns.forEach(col => {
        let maxLen = 15;
        col.eachCell({ includeEmpty: true }, (cell) => {
          maxLen = Math.max(maxLen, (cell.value + "").length + 2);
        });
        col.width = maxLen;
      });

      const filePath = `exports/reviewObjective_${numericID}_${Date.now()}.xlsx`;
      await workbook.xlsx.writeFile(filePath);

      return { filePath };
    }

    // EXPORT ALL
    const objectives = await prisma.reviewObjective.findMany({ orderBy: { id: "asc" } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Review Objectives");

    sheet.addRow([
      "Objective Code", "Description", "Category", "Related Procedures",
      "Expected Output", "Risks", "Risk Level", "Control Measures",
      "Indicators", "Reference Standards", "Notes"
    ]);

    objectives.forEach(o => {
      sheet.addRow([
        o.objectiveCode,
        o.description,
        o.category,
        o.relatedProcedures,
        o.expectedOutput,
        o.risks,
        o.riskLevel,
        o.controlMeasures,
        o.indicators,
        o.referenceStandards,
        o.notes
      ]);
    });

    sheet.columns.forEach(col => {
      let maxLen = 15;
      col.eachCell({ includeEmpty: true }, (cell) => {
        maxLen = Math.max(maxLen, (cell.value + "").length + 2);
      });
      col.width = maxLen;
    });

    const filePath = `exports/reviewObjectives_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return { filePath };
  },

  // ---------------- EXPORT (ALL + ONE) PDF ---------------- //
  exportPDF: async (filters = {}) => {
    const { id } = filters;

    let where = {};
    if (id) where.id = Number(id);

    const objectives = await prisma.reviewObjective.findMany({
      where,
      orderBy: { id: "asc" }
    });

    if (id && objectives.length === 0)
      throw { customMessage: "Record not found", status: 404 };

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filePath = `exports/reviewObjective_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // HEADER
    const drawHeader = () => {
      doc.font("Helvetica-Bold").fontSize(20).text("AL MUDAQIQ");
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(14).text("Review Objectives Report", { align: "center" });
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);
    };

    drawHeader();

    doc.on("pageAdded", () => drawHeader());

    const headers = [
      "Objective Code", "Description", "Category", "Related Procedures",
      "Expected Output", "Risks", "Risk Level", "Control Measures",
      "Indicators", "Reference Standards", "Notes"
    ];

    const cols = [100, 120, 80, 120, 120, 100, 60, 120, 80, 120, 80];

    // Draw table header
    let y = doc.y;
    let x = 40;

    doc.font("Helvetica-Bold").fontSize(9);
    headers.forEach((h, i) => {
      doc.rect(x, y, cols[i], 20).stroke();
      doc.text(h, x + 4, y + 5, { width: cols[i] - 8 });
      x += cols[i];
    });

    y += 20;
    doc.font("Helvetica").fontSize(8);

    // Rows
    objectives.forEach(obj => {
      x = 40;

      const values = [
        obj.objectiveCode, obj.description, obj.category,
        obj.relatedProcedures, obj.expectedOutput, obj.risks,
        obj.riskLevel, obj.controlMeasures, obj.indicators,
        obj.referenceStandards, obj.notes
      ];

      // Page break
      if (y > 740) {
        doc.addPage();
        y = doc.y;

        // redraw header row
        x = 40;
        doc.font("Helvetica-Bold").fontSize(9);
        headers.forEach((h, i) => {
          doc.rect(x, y, cols[i], 20).stroke();
          doc.text(h, x + 4, y + 5, { width: cols[i] - 8 });
          x += cols[i];
        });

        y += 20;
        doc.font("Helvetica").fontSize(8);
        x = 40;
      }

      values.forEach((v, i) => {
        doc.rect(x, y, cols[i], 20).stroke();
        doc.text(v || "", x + 4, y + 4, { width: cols[i] - 8 });
        x += cols[i];
      });

      y += 20;
    });

    doc.end();

    return { filePath, stream };
  }

};
