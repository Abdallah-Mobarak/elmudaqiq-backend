const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");

module.exports = {
 
 create: async (data) => {
  const {
    stageCode,
    stage,
    entityType,
    economicSector,
    procedure,
    scopeOfProcedure,
    selectionMethod,
    examplesOfUse,
    IAS,
    IFRS,
    ISA,
    relevantPolicies,
    detailedExplanation,
    formsToBeCompleted,
    practicalProcedures,
    associatedRisks,
    riskLevel,
    responsibleAuthority,
    outputs,
    implementationPeriod,
    strengths,
    potentialWeaknesses,
    performanceIndicators
  } = data;

  const item = await prisma.fileStage.create({
    data: {
      stageCode,
      stage,
      entityType,
      economicSector,
      procedure,
      scopeOfProcedure,
      selectionMethod,
      examplesOfUse,
      IAS,
      IFRS,
      ISA,
      relevantPolicies,
      detailedExplanation,
      formsToBeCompleted,
      practicalProcedures,
      associatedRisks,
      riskLevel,
      responsibleAuthority,
      outputs,
      implementationPeriod,
      strengths,
      potentialWeaknesses,
      performanceIndicators
    }
  });

  return { message: "File Stage created successfully", item };
},


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
        { economicSector: { contains: s, mode: "insensitive" } },
        { procedure: { contains: s, mode: "insensitive" } },
        { detailedExplanation: { contains: s, mode: "insensitive" } }
      ];
    }

    const total = await prisma.fileStage.count({ where });
    const data = await prisma.fileStage.findMany({
      where, skip, take, orderBy: { id: "desc" }
    });

    return { data, meta: { total, page: pageNum, limit: take, pages: Math.ceil(total / take) } };
  },

  getOne: async (id) => {
    id = Number(id);
    if (!id || isNaN(id)) throw { customMessage: "Invalid ID", status: 400 };
    const item = await prisma.fileStage.findUnique({ where: { id } });
    if (!item) throw { customMessage: "File Stage not found", status: 404 };
    return item;
  },

  update: async (id, data) => {
    id = Number(id);
    const exists = await prisma.fileStage.findUnique({ where: { id } });
    if (!exists) throw { customMessage: "File Stage not found", status: 404 };
    const updated = await prisma.fileStage.update({ where: { id }, data });
    return { message: "File Stage updated", updated };
  },

  delete: async (id) => {
    id = Number(id);
    const exists = await prisma.fileStage.findUnique({ where: { id } });
    if (!exists) throw { customMessage: "File Stage not found", status: 404 };
    await prisma.fileStage.delete({ where: { id } });
    return { message: "File Stage deleted" };
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (fileBuffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw { customMessage: "Excel sheet not found", status: 400 };

    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({
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
        performanceIndicators: row.getCell(23).value?.toString().trim() || ""
      });
    });

    let imported = 0;
    for (const r of rows) {
      await prisma.fileStage.create({ data: r });
      imported++;
    }

    return { message: "Import completed successfully", imported };
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async (filters = {}, id = null) => {
    const numericID = Number(id);
    const hasID = id && !isNaN(numericID);

    if (hasID) {
      const item = await prisma.fileStage.findUnique({ where: { id: numericID } });
      if (!item) throw { customMessage: "File Stage not found", status: 404 };

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("File Stages");

      sheet.addRow([
        "Stage Code","Stage","Entity Type","Economic Sector","Procedure","Scope of Procedure",
        "Selection Method","Examples of Use","IAS","IFRS","ISA","Relevant Policies","Detailed Explanation",
        "Forms to Be Completed","Practical Procedures","Associated Risks","Risk Level","Responsible Authority",
        "Outputs","Implementation Period","Strengths","Potential Weaknesses","Performance Indicators"
      ]);

      sheet.addRow([
        item.stageCode,item.stage,item.entityType,item.economicSector,item.procedure,item.scopeOfProcedure,
        item.selectionMethod,item.examplesOfUse,item.IAS,item.IFRS,item.ISA,item.relevantPolicies,item.detailedExplanation,
        item.formsToBeCompleted,item.practicalProcedures,item.associatedRisks,item.riskLevel,item.responsibleAuthority,
        item.outputs,item.implementationPeriod,item.strengths,item.potentialWeaknesses,item.performanceIndicators
      ]);

      sheet.columns.forEach(col => {
        let maxLen = 15;
        col.eachCell({ includeEmpty: true }, cell => {
          maxLen = Math.max(maxLen, (cell.value + "").length + 2);
        });
        col.width = maxLen;
      });

      const filePath = `exports/file_stage_${numericID}_${Date.now()}.xlsx`;
      await workbook.xlsx.writeFile(filePath);
      return { filePath };
    }

    // export all
    const { search, stageCode, stage } = filters;
    let where = {};
    if (stageCode) where.stageCode = { contains: stageCode, mode: "insensitive" };
    if (stage) where.stage = { contains: stage, mode: "insensitive" };
    if (search) {
      const s = String(search);
      where.OR = [
        { stageCode: { contains: s, mode: "insensitive" } },
        { stage: { contains: s, mode: "insensitive" } },
        { entityType: { contains: s, mode: "insensitive" } },
        { procedure: { contains: s, mode: "insensitive" } },
      ];
    }

    const items = await prisma.fileStage.findMany({ where, orderBy: { id: "asc" } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("File Stages");

    sheet.addRow([
      "Stage Code","Stage","Entity Type","Economic Sector","Procedure","Scope of Procedure",
      "Selection Method","Examples of Use","IAS","IFRS","ISA","Relevant Policies","Detailed Explanation",
      "Forms to Be Completed","Practical Procedures","Associated Risks","Risk Level","Responsible Authority",
      "Outputs","Implementation Period","Strengths","Potential Weaknesses","Performance Indicators"
    ]);

    items.forEach(item => {
      sheet.addRow([
        item.stageCode,item.stage,item.entityType,item.economicSector,item.procedure,item.scopeOfProcedure,
        item.selectionMethod,item.examplesOfUse,item.IAS,item.IFRS,item.ISA,item.relevantPolicies,item.detailedExplanation,
        item.formsToBeCompleted,item.practicalProcedures,item.associatedRisks,item.riskLevel,item.responsibleAuthority,
        item.outputs,item.implementationPeriod,item.strengths,item.potentialWeaknesses,item.performanceIndicators
      ]);
    });

    sheet.columns.forEach(col => {
      let maxLen = 15;
      col.eachCell({ includeEmpty: true }, cell => {
        maxLen = Math.max(maxLen, (cell.value + "").length + 2);
      });
      col.width = maxLen;
    });

    const filePath = `exports/file_stages_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);
    return { filePath };
  },

  // ---------------- EXPORT PDF ----------------
  exportPDF: async (filters = {}) => {
    const { id, search, stageCode, stage } = filters;
    let where = {};
    if (id) where.id = Number(id);
    if (stageCode) where.stageCode = { contains: stageCode, mode: "insensitive" };
    if (stage) where.stage = { contains: stage, mode: "insensitive" };
    if (search) {
      const s = String(search);
      where.OR = [
        { stageCode: { contains: s, mode: "insensitive" } },
        { stage: { contains: s, mode: "insensitive" } },
        { entityType: { contains: s, mode: "insensitive" } },
        { procedure: { contains: s, mode: "insensitive" } }
      ];
    }

    const items = await prisma.fileStage.findMany({ where, orderBy: { id: "asc"} });

    if (id && items.length === 0) throw { customMessage: "File Stage not found", status: 404 };

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filePath = `exports/file_stages_${Date.now()}.pdf`;
    if (!fs.existsSync("exports")) fs.mkdirSync("exports");
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const drawHeader = () => {
      doc.font("Helvetica-Bold").fontSize(20).text("AL MUDAQIQ", { align: "left" });
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(14).text("File Stages Guide Report", { align: "center" });
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);
    };

    drawHeader();
    doc.on("pageAdded", drawHeader);

    const headers = [
      { key: "stageCode", label: "Code", width: 60 },
      { key: "stage", label: "Stage", width: 100 },
      { key: "entityType", label: "Entity", width: 80 },
      { key: "procedure", label: "Procedure", width: 150 },
      { key: "responsibleAuthority", label: "Responsible", width: 80 }
    ];

    let tableY = doc.y;
    doc.font("Helvetica-Bold").fontSize(10);
    let x = 40;
    headers.forEach(h => {
      doc.rect(x, tableY, h.width, 20).stroke();
      doc.text(h.label, x + 5, tableY + 6, { width: h.width - 10 });
      x += h.width;
    });

    tableY += 20;
    doc.font("Helvetica").fontSize(9);

    items.forEach(item => {
      if (tableY > 750) { doc.addPage(); tableY = doc.y + 20; }
      let x2 = 40;
      headers.forEach(h => {
        const val = item[h.key] || "";
        doc.rect(x2, tableY, h.width, 20).stroke();
        doc.text(val, x2 + 5, tableY + 5, { width: h.width - 10 });
        x2 += h.width;
      });
      tableY += 20;
    });

    doc.moveDown(2);
    doc.fontSize(9).text(`Generated on: ${new Date().toLocaleString()}`, { align: "left" });
    doc.fontSize(9).text(`Page 1`, { align: "right" });

    doc.end();
    return { filePath, stream };
  }

};
