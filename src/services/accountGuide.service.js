const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPdf");

function treeSortAccountNumbers(data) {
  const map = new Map();
  const roots = [];

  // 1️⃣ نحول كل عنصر لنود
  data.forEach(item => {
    const key = String(item.accountNumber);
    map.set(key, { ...item, children: [] });
  });

  // 2️⃣ نربط كل عنصر بأقرب أب ليه
  map.forEach((node, key) => {
    let parentFound = false;

    for (let i = key.length - 1; i > 0; i--) {
      const parentKey = key.slice(0, i);
      if (map.has(parentKey)) {
        map.get(parentKey).children.push(node);
        parentFound = true;
        break;
      }
    }

    if (!parentFound) {
      roots.push(node);
    }
  });

  // 3️⃣ نرتب كل مستوى رقميًا
  function sortTree(nodes) {
    nodes.sort((a, b) =>
      String(a.accountNumber).localeCompare(
        String(b.accountNumber),
        undefined,
        { numeric: true }
      )
    );

    nodes.forEach(n => sortTree(n.children));
  }

  sortTree(roots);

  // 4️⃣ نفرد الشجرة في Array واحد
  const result = [];
  function flatten(nodes) {
    nodes.forEach(n => {
      result.push(n);
      flatten(n.children);
    });
  }

  flatten(roots);

  return result;
}








module.exports = {

  // =========================
  // CREATE
  // =========================
  create: async (data) => {
    const { level, accountNumber, accountName } = data;

    if (!level || !accountNumber || !accountName) {
      throw { customMessage: "Level, Account Number, and Account Name are required", status: 400 };
    }

    const item = await prisma.accountGuide.create({
      data: {
        ...data,
        level: String(level),
        accountNumber: Number(accountNumber)
      }
    });

    return { message: "Account Guide entry created", item };
  },

  // =========================
  // GET ALL + FILTER
  // =========================
getAll: async (filters = {}) => {
  const { page = 1, limit = 20, search, level, id } = filters;

  const pageNum = Number(page);
  const take = Number(limit);
  const skip = (pageNum - 1) * take;

  const where = {};

  if (id) where.id = Number(id);
  if (level) where.level = level;

  if (search) {
    where.OR = [
      { accountName: { contains: search } },
      { rulesAndRegulations: { contains: search } }
    ];
  }

  // 1) Fetch all filtered data WITHOUT pagination
  const allData = await prisma.accountGuide.findMany({
    where
  });

  // 2) Apply tree sorting HERE
  const sortedData = treeSortAccountNumbers(allData);

  // 3) Apply pagination AFTER sorting
  const paginatedData = sortedData.slice(skip, skip + take);

  return {
    data: paginatedData,
    total: sortedData.length
  };
},



  // =========================
  // UPDATE
  // =========================
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

  // =========================
  // DELETE
  // =========================
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

  // =========================
  // IMPORT EXCEL
  // =========================
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,

      rowMapper: (row) => ({
        level: String(row.getCell(1).value || "").trim(),
        accountNumber: Number(row.getCell(2).value),
        accountName: String(row.getCell(3).value || "").trim(),
        rulesAndRegulations: row.getCell(4)?.value
          ? String(row.getCell(4).value).trim()
          : null,
        disclosureNotes: row.getCell(5)?.value
          ? String(row.getCell(5).value).trim()
          : null
      }),

      insertHandler: (row) => prisma.accountGuide.create({ data: row })
    });
  },

  // =========================
  // EXPORT EXCEL (FULL COLUMNS)
  // =========================
  exportExcel: async (filters = {}) => {
    const where = {};

    if (filters.id) where.id = Number(filters.id);
    if (filters.level) where.level = filters.level;

    if (filters.search) {
      where.OR = [
        { accountName: { contains: filters.search } },
        { rulesAndRegulations: { contains: filters.search } }
      ];
    }

    const data = await prisma.accountGuide.findMany({ where });

    const result = await exportExcelUtil({
      headers: [
        "ID",
        "Level",
        "Account Number",
        "Account Name",
        "Rules & Regulations",
        "Disclosure Notes",
        "Code 1",
        "Code 2",
        "Code 3",
        "Code 4",
        "Code 5",
        "Code 6",
        "Code 7",
        "Code 8",
        "Objective Code",
        "Related Objectives",
        "Created At"
      ],
      rows: data.map(i => [
        i.id,
        i.level,
        i.accountNumber,
        i.accountName,
        i.rulesAndRegulations,
        i.disclosureNotes,
        i.code1,
        i.code2,
        i.code3,
        i.code4,
        i.code5,
        i.code6,
        i.code7,
        i.code8,
        i.objectiveCode,
        i.relatedObjectives,
        i.createdAt
      ]),
      filePrefix: "account_guide"
    });

    return result;
  },

  // =========================
  // EXPORT PDF
  // =========================
  exportPDF: async (filters = {}) => {

  const where = {};

  // Filter by ID
  if (filters.id) {
    where.id = Number(filters.id);
  }

  // Filter by Level
  if (filters.level) {
    where.level = filters.level;
  }

  // Search Filter
  if (filters.search) {
    where.OR = [
      { accountName: { contains: filters.search } },
      { rulesAndRegulations: { contains: filters.search } }
    ];
  }

  const data = await prisma.accountGuide.findMany({ where });

  return exportPDFUtil({
    title: "Accounts Guide Report",

    headers: [
      { label: "ID", width: 40 },
      { label: "Level", width: 60 },
      { label: "Account No", width: 80 },
      { label: "Account Name", width: 140 },
      { label: "Rules", width: 120 },
      { label: "Notes", width: 120 },
      { label: "Code1", width: 60 },
      { label: "Code2", width: 60 },
      { label: "Code3", width: 60 },
      { label: "Code4", width: 60 },
      { label: "Code5", width: 60 },
      { label: "Code6", width: 60 },
      { label: "Code7", width: 60 },
      { label: "Code8", width: 60 },
      { label: "Objective", width: 100 },
      { label: "Related Obj", width: 120 }
    ],

    rows: data.map(i => [
      i.id,
      i.level,
      i.accountNumber,
      i.accountName,
      i.rulesAndRegulations,
      i.disclosureNotes,
      i.code1,
      i.code2,
      i.code3,
      i.code4,
      i.code5,
      i.code6,
      i.code7,
      i.code8,
      i.objectiveCode,
      i.relatedObjectives
    ]),

    filePrefix: "account_guide_full"
  });
}

};
