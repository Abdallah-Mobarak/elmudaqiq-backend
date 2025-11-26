const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");

module.exports = {
  
  // ---------------- CREATE ---------------- //
 create: async (data) => {
  const {
    level,
    separator,
    number,
    statement,
    purpose,
    responsiblePerson,
    datePrepared,
    dateReviewed,
    conclusion,
    notes1,
    notes2,
    notes3,
    attachments
  } = data;

  const item = await prisma.reviewGuide.create({
    data: {
      level,
      separator,
      number,
      statement,
      purpose,
      responsiblePerson,
      datePrepared: datePrepared ? new Date(datePrepared) : null,
      dateReviewed: dateReviewed ? new Date(dateReviewed) : null,
      conclusion,
      notes1,
      notes2,
      notes3,
      attachments
    }
  });

  return { message: "Review Guide entry created", item };
},
  

  // ---------------- GET ALL ---------------- //
  getAll: async (options = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      level,
      responsiblePerson,
      number,
      statement
    } = options;

    const pageNum = Number(page);
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNum - 1) * take;

    let where = {};

    if (level) where.level = { contains: level, mode: "insensitive" };
    if (number) where.number = { contains: number, mode: "insensitive" };
    if (statement)
      where.statement = { contains: statement, mode: "insensitive" };
    if (responsiblePerson)
      where.responsiblePerson = {
        contains: responsiblePerson,
        mode: "insensitive",
      };

    if (search) {
      const s = String(search);

      where.OR = [
        { level: { contains: s, mode: "insensitive" } },
        { number: { contains: s, mode: "insensitive" } },
        { statement: { contains: s, mode: "insensitive" } },
        { purpose: { contains: s, mode: "insensitive" } },
        { responsiblePerson: { contains: s, mode: "insensitive" } },
        { conclusion: { contains: s, mode: "insensitive" } },
        { notes1: { contains: s, mode: "insensitive" } },
        { notes2: { contains: s, mode: "insensitive" } },
        { notes3: { contains: s, mode: "insensitive" } },
      ];
    }

    const total = await prisma.reviewGuide.count({ where });
    const data = await prisma.reviewGuide.findMany({
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

  // ---------------- GET ONE ---------------- //
  getOne: async (id) => {
    id = Number(id);

    if (!id || isNaN(id))
      throw { customMessage: "Invalid ID", status: 400 };

    const item = await prisma.reviewGuide.findUnique({ where: { id } });

    if (!item)
      throw { customMessage: "Review Guide entry not found", status: 404 };

    return item;
  },

  // ---------------- UPDATE ---------------- //
  update: async (id, data) => {
    id = Number(id);

    const exists = await prisma.reviewGuide.findUnique({
      where: { id },
    });

    if (!exists)
      throw { customMessage: "Review Guide entry not found", status: 404 };

    const updated = await prisma.reviewGuide.update({
      where: { id },
      data,
    });

    return { message: "Review Guide entry updated", updated };
  },

  // ---------------- DELETE ---------------- //
  delete: async (id) => {
    id = Number(id);

    const exists = await prisma.reviewGuide.findUnique({
      where: { id },
    });

    if (!exists)
      throw { customMessage: "Review Guide entry not found", status: 404 };

    await prisma.reviewGuide.delete({ where: { id } });

    return { message: "Review Guide entry deleted" };
  },

  
importExcel: async (fileBuffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer.buffer);

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw { customMessage: "Excel sheet not found", status: 400 };
  }

  let imported = 0;
  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header row

    rows.push({
      level: row.getCell(1).value?.toString().trim() || "",
      separator: row.getCell(2).value?.toString().trim() || "",
      number: row.getCell(3).value?.toString().trim() || "",
      statement: row.getCell(4).value?.toString().trim() || "",
      purpose: row.getCell(5).value?.toString().trim() || "",
      responsiblePerson: row.getCell(6).value?.toString().trim() || "",
      datePrepared: row.getCell(7).value ? new Date(row.getCell(7).value) : null,
      dateReviewed: row.getCell(8).value ? new Date(row.getCell(8).value) : null,
      conclusion: row.getCell(9).value?.toString().trim() || "",
      attachments: row.getCell(10).value?.toString().trim() || "",
      notes1: row.getCell(11).value?.toString().trim() || "",
      notes2: row.getCell(12).value?.toString().trim() || "",
      notes3: row.getCell(13).value?.toString().trim() || "",
    });
  });

  // Insert into DB
  for (const r of rows) {
    await prisma.reviewGuide.create({ data: r });
    imported++;
  }

  return {
    message: "Import completed successfully",
    imported,
  };
},

exportExcel: async (filters = {}, id = null) => {
  // -----------------------------------------------------
  // 1) Detect if ID is valid number → Single Export
  // -----------------------------------------------------
  const numericID = Number(id);
  const hasID = id && !isNaN(numericID); 

  if (hasID) {
    const item = await prisma.reviewGuide.findUnique({
      where: { id: numericID }
    });

    if (!item) {
      throw { customMessage: "Review Guide entry not found", status: 404 };
    }

    // ---------- EXPORT ONE ----------
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Review Guide");

    sheet.addRow([
      "Level", "Separator", "Number", "Statement", "Purpose",
      "Responsible Person", "Date Prepared", "Date Reviewed",
      "Conclusion", "Attachments", "Notes 1", "Notes 2", "Notes 3"
    ]);

    sheet.addRow([
      item.level,
      item.separator,
      item.number,
      item.statement,
      item.purpose,
      item.responsiblePerson,
      item.datePrepared ? item.datePrepared.toISOString().split("T")[0] : "",
      item.dateReviewed ? item.dateReviewed.toISOString().split("T")[0] : "",
      item.conclusion,
      item.attachments,
      item.notes1,
      item.notes2,
      item.notes3
    ]);

    // Auto-fit
    sheet.columns.forEach(col => {
      let maxLen = 15;
      col.eachCell({ includeEmpty: true }, cell => {
        maxLen = Math.max(maxLen, (cell.value + "").length + 2);
      });
      col.width = maxLen;
    });

    const filePath = `exports/review_${numericID}_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return { filePath };
  }

  // -----------------------------------------------------
  // 2) EXPORT ALL (with Filters)
  // -----------------------------------------------------
  let where = {};
  const { search, level, number, statement, responsiblePerson } = filters;

  if (level) where.level = { contains: level, mode: "insensitive" };
  if (number) where.number = { contains: number, mode: "insensitive" };
  if (statement) where.statement = { contains: statement, mode: "insensitive" };
  if (responsiblePerson)
    where.responsiblePerson = { contains: responsiblePerson, mode: "insensitive" };

  if (search) {
    const s = String(search);
    where.OR = [
      { level: { contains: s, mode: "insensitive" } },
      { number: { contains: s, mode: "insensitive" } },
      { statement: { contains: s, mode: "insensitive" } },
      { purpose: { contains: s, mode: "insensitive" } },
      { responsiblePerson: { contains: s, mode: "insensitive" } },
      { conclusion: { contains: s, mode: "insensitive" } },
      { attachments: { contains: s, mode: "insensitive" } },
      { notes1: { contains: s, mode: "insensitive" } },
      { notes2: { contains: s, mode: "insensitive" } },
      { notes3: { contains: s, mode: "insensitive" } },
    ];
  }

  const items = await prisma.reviewGuide.findMany({
    where,
    orderBy: { id: "asc" }
  });

  // ---------- EXPORT ALL ----------
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Review Guide");

  sheet.addRow([
    "Level", "Separator", "Number", "Statement", "Purpose",
    "Responsible Person", "Date Prepared", "Date Reviewed",
    "Conclusion", "Attachments", "Notes 1", "Notes 2", "Notes 3"
  ]);

  items.forEach(item => {
    sheet.addRow([
      item.level,
      item.separator,
      item.number,
      item.statement,
      item.purpose,
      item.responsiblePerson,
      item.datePrepared ? item.datePrepared.toISOString().split("T")[0] : "",
      item.dateReviewed ? item.dateReviewed.toISOString().split("T")[0] : "",
      item.conclusion,
      item.attachments,
      item.notes1,
      item.notes2,
      item.notes3
    ]);
  });

  sheet.columns.forEach(col => {
    let maxLen = 15;
    col.eachCell({ includeEmpty: true }, cell => {
      maxLen = Math.max(maxLen, (cell.value + "").length + 2);
    });
    col.width = maxLen;
  });

  const filePath = `exports/review_all_${Date.now()}.xlsx`;
  await workbook.xlsx.writeFile(filePath);

  return { filePath };
},


exportPDF: async (filters = {}) => {
  const {
    id,
    search,
    level,
    number,
    statement,
    responsiblePerson
  } = filters;

  // ----------------------------- //
  // 1) Build WHERE Conditions
  // ----------------------------- //
  let where = {};

  if (id) where.id = Number(id);
  if (level) where.level = { contains: level, mode: "insensitive" };
  if (number) where.number = { contains: number, mode: "insensitive" };
  if (statement) where.statement = { contains: statement, mode: "insensitive" };
  if (responsiblePerson)
    where.responsiblePerson = {
      contains: responsiblePerson,
      mode: "insensitive"
    };

  if (search) {
    const s = String(search);

    where.OR = [
      { level: { contains: s, mode: "insensitive" } },
      { number: { contains: s, mode: "insensitive" } },
      { statement: { contains: s, mode: "insensitive" } },
      { purpose: { contains: s, mode: "insensitive" } },
      { responsiblePerson: { contains: s, mode: "insensitive" } },
      { conclusion: { contains: s, mode: "insensitive" } },
      { attachments: { contains: s, mode: "insensitive" } },
      { notes1: { contains: s, mode: "insensitive" } },
      { notes2: { contains: s, mode: "insensitive" } },
      { notes3: { contains: s, mode: "insensitive" } }
    ];
  }

  // ----------------------------- //
  // 2) Fetch Records
  // ----------------------------- //
  const items = await prisma.reviewGuide.findMany({
    where,
    orderBy: { id: "asc" }
  });

  if (id && items.length === 0) {
    throw { customMessage: "Review Guide entry not found", status: 404 };
  }

  // ----------------------------- //
  // 3) Generate PDF
  // ----------------------------- //
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  const filePath = `exports/review_guide_${Date.now()}.pdf`;

  if (!fs.existsSync("exports")) fs.mkdirSync("exports");

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ----------------------------- //
  // HEADER FUNCTION (REPEATED)
  // ----------------------------- //
  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(20).text("AL MUDAQIQ", { align: "left" });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(14).text("Review Guide Report", { align: "center" });
    doc.moveDown(1);

    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);
  };

  drawHeader();

  doc.on("pageAdded", () => {
    drawHeader();
  });

  // ----------------------------- //
  // TABLE HEADERS
  // ----------------------------- //
  const headers = [
    { key: "level", label: "Level", width: 50 },
    { key: "separator", label: "Separator", width: 60 },
    { key: "number", label: "Number", width: 60 },
    { key: "statement", label: "Statement", width: 100 },
    { key: "purpose", label: "Purpose", width: 100 },
    { key: "responsiblePerson", label: "Responsible", width: 80 },
    { key: "datePrepared", label: "Prepared", width: 60 },
    { key: "dateReviewed", label: "Reviewed", width: 60 },
    { key: "conclusion", label: "Conclusion", width: 90 }
  ];

  let tableY = doc.y;

  // HEADER ROW
  doc.font("Helvetica-Bold").fontSize(10);

  let x = 40;
  headers.forEach((h) => {
    doc.rect(x, tableY, h.width, 20).stroke();
    doc.text(h.label, x + 5, tableY + 6, { width: h.width - 10 });
    x += h.width;
  });

  tableY += 20;
  doc.font("Helvetica").fontSize(9);

  // ----------------------------- //
  // TABLE BODY
  // ----------------------------- //
  items.forEach((item) => {
    let rowY = tableY;

    // page break
    if (rowY > 750) {
      doc.addPage();
      tableY = doc.y + 20;
      rowY = tableY;

      let x2 = 40;
      doc.font("Helvetica-Bold").fontSize(10);

      headers.forEach((h) => {
        doc.rect(x2, tableY - 20, h.width, 20).stroke();
        doc.text(h.label, x2 + 5, tableY - 14, { width: h.width - 10 });
        x2 += h.width;
      });

      doc.font("Helvetica").fontSize(9);
    }

    // draw row
    let x3 = 40;

    headers.forEach((h) => {
      const val = item[h.key] || "";

      const textValue =
        val instanceof Date ? val.toISOString().split("T")[0] : String(val);

      doc.rect(x3, rowY, h.width, 20).stroke();
      doc.text(textValue, x3 + 5, rowY + 5, { width: h.width - 10 });

      x3 += h.width;
    });

    tableY += 20;
  });

  // FOOTER
  doc.moveDown(2);
  doc.fontSize(9).text(`Generated on: ${new Date().toLocaleString()}`, { align: "left" });
  doc.fontSize(9).text(`Page 1`, { align: "right" });

  doc.end();

  return { filePath, stream };
},



};
