const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");


module.exports = {
 
  create: async (data) => {
    const {
      level,
      accountNumber,
      accountName,
      rulesAndRegulations,
      disclosureNotes,
      code1,
      code2,
      code3,
      code4,
      code5,
      code6,
      code7,
      code8,
      objectiveCode,
      relatedObjectives
    } = data;

    if (!level || !accountNumber || !accountName) {
      throw { customMessage: "Level, Account Number, and Account Name are required", status: 400 };
    }

    const item = await prisma.accountGuide.create({
      data: {
        level,
        accountNumber: Number(accountNumber),
        accountName,
        rulesAndRegulations,
        disclosureNotes,
        code1,
        code2,
        code3,
        code4,
        code5,
        code6,
        code7,
        code8,
        objectiveCode,
        relatedObjectives
      }
    });

    return { message: "Account Guide entry created", item };
  },

 getAll: async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    level,
    accountNumber,
    accountName,
    code,
    sortBy = "id",
    sortOrder = "desc"
  } = options;

  const pageNum = Number(page) >= 1 ? Number(page) : 1;
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (pageNum - 1) * take;

  // build where object
  const where = {};

  // exact filters
  if (level) where.level = { equals: level };
  if (accountNumber) where.accountNumber = Number(accountNumber);
  if (accountName) where.accountName = { contains: accountName };

  // code filter (any of the code fields)
  if (code) {
    const c = String(code);
    where.OR = [
      { code1: { contains: c } },
      { code2: { contains: c } },
      { code3: { contains: c } },
      { code4: { contains: c } },
      { code5: { contains: c } },
      { code6: { contains: c } },
      { code7: { contains: c } },
      { code8: { contains: c } },
      { objectiveCode: { contains: c } },
      { relatedObjectives: { contains: c } }
    ];
  }

  // global search
  if (search) {
    const s = String(search);
    const searchConditions = [
      { accountName: { contains: s } },
      { level: { contains: s } },
      { rulesAndRegulations: { contains: s } },
      { disclosureNotes: { contains: s } },
      { objectiveCode: { contains: s } },
      { relatedObjectives: { contains: s } },
      { code1: { contains: s } },
      { code2: { contains: s } },
      { code3: { contains: s } },
      { code4: { contains: s } },
      { code5: { contains: s } },
      { code6: { contains: s } },
      { code7: { contains: s } },
      { code8: { contains: s } }
    ];

    // numeric search for accountNumber
    const parsedNum = Number(s);
    if (!isNaN(parsedNum)) {
      searchConditions.push({
        accountNumber: parsedNum
      });
    }

    // merge with existing OR if present
    where.OR = (where.OR || []).concat(searchConditions);
  }

  // sorting
  const allowedSortFields = ["id", "accountNumber", "accountName", "level", "createdAt"];
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : "id";
  const orderDirection = sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

  // count total
  const total = await prisma.accountGuide.count({ where });

  // fetch data
  const data = await prisma.accountGuide.findMany({
    where,
    skip,
    take,
    orderBy: { [orderField]: orderDirection }
  });

  const pages = Math.ceil(total / take) || 1;

  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: take,
      pages
    }
  };
},


getOne: async (id) => {

  id = Number(id); 

  if (!id || isNaN(id)) {
    throw { customMessage: "Invalid or missing ID", status: 400 };
  }

  const item = await prisma.accountGuide.findUnique({
    where: { id }
  });

  if (!item) {
    throw { customMessage: "Account Guide entry not found", status: 404 };
  }

  return item;
},


update: async (id, data) => {

    const exists = await prisma.accountGuide.findUnique({
      where: { id: Number(id) }
    });

    if (!exists) {
      throw { customMessage: "Account Guide entry not found", status: 404 };
    }

    const updated = await prisma.accountGuide.update({
      where: { id: Number(id) },
      data
    });

    return { message: "Account Guide entry updated", updated };
  },

delete: async (id) => {
    const exists = await prisma.accountGuide.findUnique({
      where: { id: Number(id) }
    });

    if (!exists) {
      throw { customMessage: "Account Guide entry not found", status: 404 };
    }

    await prisma.accountGuide.delete({
      where: { id: Number(id) }
    });

    return { message: "Account Guide entry deleted" };
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
        accountNumber: Number(row.getCell(2).value) || 0,
        accountName: row.getCell(3).value?.toString().trim() || "",
        rulesAndRegulations: row.getCell(4).value?.toString().trim() || "",
        disclosureNotes: row.getCell(5).value?.toString().trim() || "",
        code1: row.getCell(6).value?.toString().trim() || "",
        code2: row.getCell(7).value?.toString().trim() || "",
        code3: row.getCell(8).value?.toString().trim() || "",
        code4: row.getCell(9).value?.toString().trim() || "",
        code5: row.getCell(10).value?.toString().trim() || "",
        code6: row.getCell(11).value?.toString().trim() || "",
        code7: row.getCell(12).value?.toString().trim() || "",
        code8: row.getCell(13).value?.toString().trim() || "",
        objectiveCode: row.getCell(14).value?.toString().trim() || "",
        relatedObjectives: row.getCell(15).value?.toString().trim() || "",
      });
    });

    // Insert into DB
    for (const r of rows) {
      await prisma.accountGuide.create({ data: r });
      imported++;
    }

    return {
      message: "Import completed successfully",
      imported,
    };
  },

  
  // ---------------- EXPORT PDF ---------------- //
 exportPDF: async (filters = {}) => {
  const {
    id,
    search,
    level,
    accountNumber,
    accountName,
    code
  } = filters;

  // ----------------------------- //
  // 1) Build WHERE Conditions
  // ----------------------------- //
  let where = {};

  if (id) where.id = Number(id);
  if (level) where.level = { equals: level };
  if (accountNumber) where.accountNumber = Number(accountNumber);
  if (accountName)
    where.accountName = { contains: accountName, mode: "insensitive" };

  if (code) {
    const c = String(code);
    where.OR = [
      { code1: { contains: c, mode: "insensitive" } },
      { code2: { contains: c, mode: "insensitive" } },
      { code3: { contains: c, mode: "insensitive" } },
      { code4: { contains: c, mode: "insensitive" } },
      { code5: { contains: c, mode: "insensitive" } },
      { code6: { contains: c, mode: "insensitive" } },
      { code7: { contains: c, mode: "insensitive" } },
      { code8: { contains: c, mode: "insensitive" } },
      { objectiveCode: { contains: c, mode: "insensitive" } },
      { relatedObjectives: { contains: c, mode: "insensitive" } }
    ];
  }

  if (search) {
    const s = String(search);
    where.OR = (where.OR || []).concat(
      [
        { accountName: { contains: s, mode: "insensitive" } },
        { level: { contains: s, mode: "insensitive" } },
        { rulesAndRegulations: { contains: s, mode: "insensitive" } },
        { disclosureNotes: { contains: s, mode: "insensitive" } },
        { objectiveCode: { contains: s, mode: "insensitive" } },
        { relatedObjectives: { contains: s, mode: "insensitive" } },
        { code1: { contains: s, mode: "insensitive" } },
        { code2: { contains: s, mode: "insensitive" } },
        { code3: { contains: s, mode: "insensitive" } },
        { code4: { contains: s, mode: "insensitive" } },
        { code5: { contains: s, mode: "insensitive" } },
        { code6: { contains: s, mode: "insensitive" } },
        { code7: { contains: s, mode: "insensitive" } },
        { code8: { contains: s, mode: "insensitive" } },
        {
          accountNumber: isNaN(Number(s)) ? undefined : Number(s)
        }
      ].filter(Boolean)
    );
  }

  // ----------------------------- //
  // 2) Fetch Rows
  // ----------------------------- //
  const guides = await prisma.accountGuide.findMany({
    where,
    orderBy: { id: "asc" }
  });

  if (id && guides.length === 0) {
    throw { customMessage: "Account Guide entry not found", status: 404 };
  }

  // ----------------------------- //
  // 3) Generate Professional PDF
  // ----------------------------- //
  const PDFDocument = require("pdfkit");

  const doc = new PDFDocument({
    size: "A4",
    margin: 40
  });

  const filePath = `exports/accounts_guide_${Date.now()}.pdf`;

  if (!fs.existsSync("exports")) fs.mkdirSync("exports");

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // =====================================================
  // HEADER (ثابت)
  // =====================================================
  const drawHeader = () => {
    doc.font("Helvetica-Bold")
      .fontSize(20)
      .text("AL MUDAQIQ", { align: "left" });
    doc.moveDown(0.5);

    doc.font("Helvetica")
      .fontSize(14)
      .text("Accounts Guide Report", { align: "center" });
    doc.moveDown(1);

    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);
  };

  drawHeader();

  doc.on("pageAdded", () => {
    drawHeader();
  });

  // =====================================================
  // TABLE SETTINGS
  // =====================================================
  const maxWidths = {
    level: 40,
    accountNumber: 70,
    accountName: 150,
    rules: 180,
    notes: 180,
    code1: 60,
    objective: 100
  };

  const tableHeaders = [
    { label: "Level", key: "level", width: maxWidths.level },
    { label: "Acc Number", key: "accountNumber", width: maxWidths.accountNumber },
    { label: "Acc Name", key: "accountName", width: maxWidths.accountName },
    { label: "Rules", key: "rulesAndRegulations", width: maxWidths.rules },
    { label: "Notes", key: "disclosureNotes", width: maxWidths.notes },
    { label: "Code 1", key: "code1", width: maxWidths.code1 },
    { label: "Objective", key: "objectiveCode", width: maxWidths.objective }
  ];

  let tableTop = doc.y;

  // Draw table header
  doc.font("Helvetica-Bold").fontSize(10);

  let x = 40;
  tableHeaders.forEach((h) => {
    doc.rect(x, tableTop, h.width, 20).stroke();

    doc.text(h.label, x + 5, tableTop + 6, {
      width: h.width - 10
    });

    x += h.width;
  });

  tableTop += 20;

  // =====================================================
  // TABLE BODY
  // =====================================================
  doc.font("Helvetica").fontSize(9);

  const rowHeight = 18;

  guides.forEach((g) => {
    let rowY = tableTop;

    // Page break
    if (rowY > 750) {
      doc.addPage();
      tableTop = doc.y;

      // redraw header
      let x2 = 40;
      doc.font("Helvetica-Bold").fontSize(10);

      tableHeaders.forEach((h) => {
        doc.rect(x2, tableTop, h.width, 20).stroke();
        doc.text(h.label, x2 + 5, tableTop + 6, {
          width: h.width - 10
        });
        x2 += h.width;
      });

      tableTop += 20;
      rowY = tableTop;
    }

    // Draw row
    let x3 = 40;

    tableHeaders.forEach((h) => {
      doc.rect(x3, rowY, h.width, rowHeight).stroke();

      let textValue = g[h.key] ?? "";

      doc.text(textValue, x3 + 5, rowY + 5, {
        width: h.width - 10
      });

      x3 += h.width;
    });

    tableTop += rowHeight;
  });

  // =====================================================
  // FOOTER
  // =====================================================
  doc.moveDown(2);
  doc.fontSize(9).text(`Generated on: ${new Date().toLocaleString()}`, {
    align: "left"
  });

  doc.fontSize(9).text(`Page ${doc.bufferedPageRange().start + 1}`, {
    align: "right"
  });

  doc.end();

  return { filePath, stream };
},


// exportExcel: async (filters = {}) => {
//   const {
//     id,
//     search,
//     level,
//     accountNumber,
//     accountName,
//     code
//   } = filters;

//   let where = {};

//   if (id) where.id = Number(id);
//   if (level) where.level = { equals: level };
//   if (accountNumber) where.accountNumber = Number(accountNumber);
//   if (accountName)
//     where.accountName = { contains: accountName, mode: "insensitive" };

//   if (code) {
//     const c = String(code);
//     where.OR = [
//       { code1: { contains: c, mode: "insensitive" } },
//       { code2: { contains: c, mode: "insensitive" } },
//       { code3: { contains: c, mode: "insensitive" } },
//       { code4: { contains: c, mode: "insensitive" } },
//       { code5: { contains: c, mode: "insensitive" } },
//       { code6: { contains: c, mode: "insensitive" } },
//       { code7: { contains: c, mode: "insensitive" } },
//       { code8: { contains: c, mode: "insensitive" } },
//       { objectiveCode: { contains: c, mode: "insensitive" } },
//       { relatedObjectives: { contains: c, mode: "insensitive" } }
//     ];
//   }

//   if (search) {
//     const s = String(search);
//     where.OR = (where.OR || []).concat(
//       [
//         { accountName: { contains: s, mode: "insensitive" } },
//         { level: { contains: s, mode: "insensitive" } },
//         { rulesAndRegulations: { contains: s, mode: "insensitive" } },
//         { disclosureNotes: { contains: s, mode: "insensitive" } },
//         { objectiveCode: { contains: s, mode: "insensitive" } },
//         { relatedObjectives: { contains: s, mode: "insensitive" } },
//         { code1: { contains: s, mode: "insensitive" } },
//         { code2: { contains: s, mode: "insensitive" } },
//         { code3: { contains: s, mode: "insensitive" } },
//         { code4: { contains: s, mode: "insensitive" } },
//         { code5: { contains: s, mode: "insensitive" } },
//         { code6: { contains: s, mode: "insensitive" } },
//         { code7: { contains: s, mode: "insensitive" } },
//         { code8: { contains: s, mode: "insensitive" } },
//         {
//           accountNumber: isNaN(Number(s)) ? undefined : Number(s)
//         }
//       ].filter(Boolean)
//     );
//   }

//   const guides = await prisma.accountGuide.findMany({
//     where,
//     orderBy: { id: "asc" }
//   });

//   const ExcelJS = require("exceljs");
//   const workbook = new ExcelJS.Workbook();
//   const sheet = workbook.addWorksheet("Accounts Guide");

//   // Header
//   sheet.addRow([
//     "Level",
//     "Account Number",
//     "Account Name",
//     "Rules & Regulations",
//     "Notes",
//     "Code 1",
//     "Code 2",
//     "Code 3",
//     "Code 4",
//     "Code 5",
//     "Code 6",
//     "Code 7",
//     "Code 8",
//     "Objective Code",
//     "Related Objectives"
//   ]);

//   // Rows
//   guides.forEach((g) => {
//     sheet.addRow([
//       g.level,
//       g.accountNumber,
//       g.accountName,
//       g.rulesAndRegulations,
//       g.disclosureNotes,
//       g.code1,
//       g.code2,
//       g.code3,
//       g.code4,
//       g.code5,
//       g.code6,
//       g.code7,
//       g.code8,
//       g.objectiveCode,
//       g.relatedObjectives
//     ]);
//   });

//   // Auto-fit width
//   sheet.columns.forEach((col) => {
//     let maxLen = 15;
//     col.eachCell({ includeEmpty: true }, (cell) => {
//       const v = cell.value ? cell.value.toString() : "";
//       maxLen = Math.max(maxLen, v.length + 2);
//     });
//     col.width = maxLen;
//   });

//   // Save file
//   const filePath = `exports/accounts_guide_${Date.now()}.xlsx`;
//   await workbook.xlsx.writeFile(filePath);

//   return { filePath };
// }



exportExcel: async (filters = {}, id = null) => {
  // -----------------------------------------------------
  // 1) Detect if ID is valid number → Single Export
  // -----------------------------------------------------
  const numericID = Number(id);
  const hasID = id && !isNaN(numericID); 
  // hasID = true فقط لو id رقم حقيقي

  if (hasID) {
    const item = await prisma.accountGuide.findUnique({
      where: { id: numericID }
    });

    if (!item) {
      throw { customMessage: "Account Guide entry not found", status: 404 };
    }

    // ---------- EXPORT ONE ----------
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Account Guide");

    sheet.addRow([
      "Level", "Account Number", "Account Name",
      "Rules & Regulations", "Notes",
      "Code 1", "Code 2", "Code 3", "Code 4",
      "Code 5", "Code 6", "Code 7", "Code 8",
      "Objective Code", "Related Objectives"
    ]);

    sheet.addRow([
      item.level,
      item.accountNumber,
      item.accountName,
      item.rulesAndRegulations,
      item.disclosureNotes,
      item.code1, item.code2, item.code3, item.code4,
      item.code5, item.code6, item.code7, item.code8,
      item.objectiveCode,
      item.relatedObjectives
    ]);

    // Auto-fit
    sheet.columns.forEach(col => {
      let maxLen = 15;
      col.eachCell({ includeEmpty: true }, cell => {
        maxLen = Math.max(maxLen, (cell.value + "").length + 2);
      });
      col.width = maxLen;
    });

    const filePath = `exports/account_${numericID}_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    return { filePath };
  }

  // -----------------------------------------------------
  // 2) EXPORT ALL — لو id مش موجود أو مش رقم
  // -----------------------------------------------------
  let where = {};
  const { search, level, accountNumber, accountName, code } = filters;

  if (level) where.level = { equals: level };
  if (accountNumber) where.accountNumber = Number(accountNumber);
  if (accountName)
    where.accountName = { contains: accountName, mode: "insensitive" };

  if (code) {
    const c = String(code);
    where.OR = [
      { code1: { contains: c, mode: "insensitive" } },
      { code2: { contains: c, mode: "insensitive" } },
      { code3: { contains: c, mode: "insensitive" } },
      { code4: { contains: c, mode: "insensitive" } },
      { code5: { contains: c, mode: "insensitive" } },
      { code6: { contains: c, mode: "insensitive" } },
      { code7: { contains: c, mode: "insensitive" } },
      { code8: { contains: c, mode: "insensitive" } },
      { objectiveCode: { contains: c, mode: "insensitive" } },
      { relatedObjectives: { contains: c, mode: "insensitive" } }
    ];
  }

  if (search) {
    const s = String(search);

    where.OR = (where.OR || []).concat([
      { accountName: { contains: s, mode: "insensitive" } },
      { level: { contains: s, mode: "insensitive" } },
      { rulesAndRegulations: { contains: s, mode: "insensitive" } },
      { disclosureNotes: { contains: s, mode: "insensitive" } },
      { objectiveCode: { contains: s, mode: "insensitive" } },
      { relatedObjectives: { contains: s, mode: "insensitive" } },
      { code1: { contains: s, mode: "insensitive" } },
      { code2: { contains: s, mode: "insensitive" } },
      { code3: { contains: s, mode: "insensitive" } },
      { code4: { contains: s, mode: "insensitive" } },
      { code5: { contains: s, mode: "insensitive" } },
      { code6: { contains: s, mode: "insensitive" } },
      { code7: { contains: s, mode: "insensitive" } },
      { code8: { contains: s, mode: "insensitive" } },
      { accountNumber: isNaN(Number(s)) ? undefined : Number(s) }
    ].filter(Boolean));
  }

  const guides = await prisma.accountGuide.findMany({
    where,
    orderBy: { id: "asc" }
  });

  // ---------- EXPORT ALL ----------
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Accounts Guide");

  sheet.addRow([
    "Level", "Account Number", "Account Name",
    "Rules & Regulations", "Notes",
    "Code 1", "Code 2", "Code 3", "Code 4",
    "Code 5", "Code 6", "Code 7", "Code 8",
    "Objective Code", "Related Objectives"
  ]);

  guides.forEach(g => {
    sheet.addRow([
      g.level,
      g.accountNumber,
      g.accountName,
      g.rulesAndRegulations,
      g.disclosureNotes,
      g.code1, g.code2, g.code3, g.code4,
      g.code5, g.code6, g.code7, g.code8,
      g.objectiveCode,
      g.relatedObjectives
    ]);
  });

  sheet.columns.forEach(col => {
    let maxLen = 15;
    col.eachCell({ includeEmpty: true }, cell => {
      maxLen = Math.max(maxLen, (cell.value + "").length + 2);
    });
    col.width = maxLen;
  });

  const filePath = `exports/accounts_${Date.now()}.xlsx`;
  await workbook.xlsx.writeFile(filePath);

  return { filePath };
},



};




