const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");

if (!fs.existsSync("exports")) fs.mkdirSync("exports");

module.exports = {
  // ------------------------------------------------------------------
  // CREATE
  // ------------------------------------------------------------------
  create: async (data) => {
    // Split codes and count them
    let numberOfCollectedObjectives = null;

    if (data.codesCollected) {
      const codes = data.codesCollected
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c);

      numberOfCollectedObjectives = codes.length;
    }

    // Calculate totalRelativeWeight
    const percentages = [
      data.ethicalCompliancePercentage,
      data.professionalPlanningPercentage,
      data.internalControlPercentage,
      data.evidencePercentage,
      data.evaluationPercentage,
      data.documentationPercentage
    ];

    const totalRelativeWeight = percentages
      .map((p) => Number(p) || 0)
      .reduce((acc, val) => acc + val, 0);

    // Calculate gap %
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

  // ------------------------------------------------------------------
  // GET ALL + FILTERS
  // ------------------------------------------------------------------
  getAll: async (filters = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      implementationStatus,
      codesCollected
    } = filters;

    const where = {};

    if (implementationStatus)
      where.implementationStatus = {
        contains: implementationStatus,
        mode: "insensitive"
      };

    if (codesCollected)
      where.codesCollected = {
        contains: codesCollected,
        mode: "insensitive"
      };

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
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  },

  // ------------------------------------------------------------------
  // GET ONE
  // ------------------------------------------------------------------
  getOne: async (id) => {
    const numericID = Number(id);

    const item = await prisma.reviewObjectiveStage.findUnique({
      where: { id: numericID }
    });

    if (!item) throw { customMessage: "Record not found", status: 404 };

    return item;
  },

  // ------------------------------------------------------------------
  // UPDATE
  // ------------------------------------------------------------------
  update: async (id, data) => {
    const numericID = Number(id);

    const exists = await prisma.reviewObjectiveStage.findUnique({
      where: { id: numericID }
    });

    if (!exists) throw { customMessage: "Record not found", status: 404 };

    // Recalculate codes count if changed
    let numberOfCollectedObjectives = exists.numberOfCollectedObjectives;

    if (data.codesCollected) {
      const codes = data.codesCollected
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c);

      numberOfCollectedObjectives = codes.length;
    }

    // Recalculate totalRelativeWeight
    const percentages = [
      data.ethicalCompliancePercentage ?? exists.ethicalCompliancePercentage,
      data.professionalPlanningPercentage ?? exists.professionalPlanningPercentage,
      data.internalControlPercentage ?? exists.internalControlPercentage,
      data.evidencePercentage ?? exists.evidencePercentage,
      data.evaluationPercentage ?? exists.evaluationPercentage,
      data.documentationPercentage ?? exists.documentationPercentage
    ];

    const totalRelativeWeight = percentages
      .map((p) => Number(p) || 0)
      .reduce((acc, val) => acc + val, 0);

    // Recalculate gap
    const actualPerf =
      data.actualPerformance !== undefined
        ? data.actualPerformance
        : exists.actualPerformance;

    const gapPercentage =
      actualPerf !== null && actualPerf !== undefined
        ? totalRelativeWeight - Number(actualPerf)
        : exists.gapPercentage;

    const updated = await prisma.reviewObjectiveStage.update({
      where: { id: numericID },
      data: {
        ...data,
        numberOfCollectedObjectives,
        totalRelativeWeight,
        gapPercentage
      }
    });

    return { message: "Updated successfully", updated };
  },

  // ------------------------------------------------------------------
  // DELETE
  // ------------------------------------------------------------------
  delete: async (id) => {
    const numericID = Number(id);

    const exists = await prisma.reviewObjectiveStage.findUnique({
      where: { id: numericID }
    });

    if (!exists) throw { customMessage: "Record not found", status: 404 };

    await prisma.reviewObjectiveStage.delete({ where: { id: numericID } });

    return { message: "Deleted successfully" };
  },

  // ------------------------------------------------------------------
  // IMPORT EXCEL
  // ------------------------------------------------------------------
  importExcel: async (file) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const sheet = workbook.worksheets[0];
    const rows = [];
    let imported = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      rows.push({
        codesCollected: row.getCell(1).value?.toString().trim(),
        ethicalCompliancePercentage: Number(row.getCell(2).value) || 0,
        professionalPlanningPercentage: Number(row.getCell(3).value) || 0,
        internalControlPercentage: Number(row.getCell(4).value) || 0,
        evidencePercentage: Number(row.getCell(5).value) || 0,
        evaluationPercentage: Number(row.getCell(6).value) || 0,
        documentationPercentage: Number(row.getCell(7).value) || 0,
        implementationStatus: row.getCell(8).value?.toString().trim(),
        actualPerformance: Number(row.getCell(9).value) || 0,
        codeOfEthics: row.getCell(10).value?.toString().trim(),
        policies: row.getCell(11).value?.toString().trim(),
        ifrs: row.getCell(12).value?.toString().trim(),
        ias: row.getCell(13).value?.toString().trim(),
        notes: row.getCell(14).value?.toString().trim()
      });
    });

    for (const r of rows) {
      // Calculate numbers
      let numberOfCollectedObjectives = null;
      if (r.codesCollected) {
        const codes = r.codesCollected.split(",").map((c) => c.trim());
        numberOfCollectedObjectives = codes.length;
      }

      const percentages = [
        r.ethicalCompliancePercentage,
        r.professionalPlanningPercentage,
        r.internalControlPercentage,
        r.evidencePercentage,
        r.evaluationPercentage,
        r.documentationPercentage
      ];

      const totalRelativeWeight = percentages.reduce((acc, val) => acc + val, 0);
      const gapPercentage = totalRelativeWeight - r.actualPerformance;

      await prisma.reviewObjectiveStage.create({
        data: {
          ...r,
          numberOfCollectedObjectives,
          totalRelativeWeight,
          gapPercentage
        }
      });

      imported++;
    }

    return { message: "Import complete", imported };
  },

  // ------------------------------------------------------------------
  // EXPORT EXCEL (ALL + ONE)
  // ------------------------------------------------------------------
  exportExcel: async (filters = {}, id = null) => {
    const hasID = id !== null && id !== undefined && id !== "";

    if (hasID) {
      const numericID = Number(id);
      const item = await prisma.reviewObjectiveStage.findUnique({
        where: { id: numericID }
      });

      if (!item) throw { customMessage: "Not found", status: 404 };

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Stage");

      sheet.addRow([
        "Codes",
        "Collected Count",
        "Ethical %",
        "Planning %",
        "Internal Control %",
        "Evidence %",
        "Evaluation %",
        "Documentation %",
        "Total Weight",
        "Status",
        "Actual Perf",
        "Gap %",
        "Ethics",
        "Policies",
        "IFRS",
        "IAS",
        "Notes"
      ]);

      sheet.addRow([
        item.codesCollected,
        item.numberOfCollectedObjectives,
        item.ethicalCompliancePercentage,
        item.professionalPlanningPercentage,
        item.internalControlPercentage,
        item.evidencePercentage,
        item.evaluationPercentage,
        item.documentationPercentage,
        item.totalRelativeWeight,
        item.implementationStatus,
        item.actualPerformance,
        item.gapPercentage,
        item.codeOfEthics,
        item.policies,
        item.ifrs,
        item.ias,
        item.notes
      ]);

      sheet.columns.forEach((col) => {
        let maxLen = 15;
        col.eachCell({ includeEmpty: true }, (cell) => {
          maxLen = Math.max(maxLen, (cell.value + "").length + 2);
        });
        col.width = maxLen;
      });

      const filePath = `exports/stage_${numericID}_${Date.now()}.xlsx`;
      await workbook.xlsx.writeFile(filePath);

      return { filePath };
    }

    // EXPORT ALL -------------------------------------------------------
    const items = await prisma.reviewObjectiveStage.findMany({
      orderBy: { id: "asc" }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Review Objective Stages");

    sheet.addRow([
      "Codes",
      "Collected Count",
      "Ethical %",
      "Planning %",
      "Internal Control %",
      "Evidence %",
      "Evaluation %",
      "Documentation %",
      "Total Weight",
      "Status",
      "Actual Perf",
      "Gap %",
      "Ethics",
      "Policies",
      "IFRS",
      "IAS",
      "Notes"
    ]);

    items.forEach((item) => {
      sheet.addRow([
        item.codesCollected,
        item.numberOfCollectedObjectives,
        item.ethicalCompliancePercentage,
        item.professionalPlanningPercentage,
        item.internalControlPercentage,
        item.evidencePercentage,
        item.evaluationPercentage,
        item.documentationPercentage,
        item.totalRelativeWeight,
        item.implementationStatus,
        item.actualPerformance,
        item.gapPercentage,
        item.codeOfEthics,
        item.policies,
        item.ifrs,
        item.ias,
        item.notes
      ]);
    });

    sheet.columns.forEach((col) => {
      let maxLen = 15;
      col.eachCell({ includeEmpty: true }, (cell) => {
        maxLen = Math.max(maxLen, (cell.value + "").length + 2);
      });
      col.width = maxLen;
    });

    const filePath = `exports/reviewObjectiveStages_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return { filePath };
  },

  // ------------------------------------------------------------------
  // EXPORT PDF (ALL + ONE)
  // ------------------------------------------------------------------
  exportPDF: async (filters = {}) => {
    const { id } = filters;

    let where = {};

    if (id) where.id = Number(id);

    const items = await prisma.reviewObjectiveStage.findMany({
      where,
      orderBy: { id: "asc" }
    });

    if (id && items.length === 0)
      throw { customMessage: "Not found", status: 404 };

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filePath = `exports/reviewObjectiveStage_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const drawHeader = () => {
      doc.font("Helvetica-Bold").fontSize(20).text("AL MUDAQIQ");
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(14).text("Review Objective Stages Report", {
        align: "center"
      });
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);
    };

    drawHeader();

    doc.on("pageAdded", () => drawHeader());

    const headers = [
      "Codes",
      "Count",
      "Eth %",
      "Plan %",
      "IC %",
      "Evid %",
      "Eval %",
      "Doc %",
      "Total",
      "Status",
      "Actual",
      "Gap",
      "Ethics",
      "Policies",
      "IFRS",
      "IAS",
      "Notes"
    ];

    const cols = [70, 40, 40, 40, 40, 40, 40, 40, 40, 60, 40, 40, 70, 70, 60, 60, 70];

    let y = doc.y;
    let x = 40;

    doc.font("Helvetica-Bold").fontSize(8);
    headers.forEach((h, i) => {
      doc.rect(x, y, cols[i], 20).stroke();
      doc.text(h, x + 4, y + 5, { width: cols[i] - 8 });
      x += cols[i];
    });

    y += 20;
    doc.font("Helvetica").fontSize(7);

    items.forEach((item) => {
      x = 40;

      const values = [
        item.codesCollected,
        item.numberOfCollectedObjectives,
        item.ethicalCompliancePercentage,
        item.professionalPlanningPercentage,
        item.internalControlPercentage,
        item.evidencePercentage,
        item.evaluationPercentage,
        item.documentationPercentage,
        item.totalRelativeWeight,
        item.implementationStatus,
        item.actualPerformance,
        item.gapPercentage,
        item.codeOfEthics,
        item.policies,
        item.ifrs,
        item.ias,
        item.notes
      ];

      if (y > 740) {
        doc.addPage();
        y = doc.y;

        x = 40;
        doc.font("Helvetica-Bold").fontSize(8);
        headers.forEach((h, i) => {
          doc.rect(x, y, cols[i], 20).stroke();
          doc.text(h, x + 4, y + 5, { width: cols[i] - 8 });
          x += cols[i];
        });
        y += 20;
        doc.font("Helvetica").fontSize(7);
        x = 40;
      }

      values.forEach((v, i) => {
        doc.rect(x, y, cols[i], 20).stroke();
        doc.text(v || "", x + 3, y + 3, { width: cols[i] - 6 });
        x += cols[i];
      });

      y += 20;
    });

    doc.end();

    return { filePath, stream };
  }
};
 