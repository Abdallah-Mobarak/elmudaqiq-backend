const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPdf");

function treeSortAccountNumbers(data) {
  // Handle empty data
  if (!data || data.length === 0) return [];

  // Step 1: Convert each item to a node (use ID as unique key to preserve all records)
  const nodes = data.map(item => ({
    ...item,
    children: [],
    _key: String(item.accountNumber) // For parent lookup
  }));

  // Step 2: Create a map for quick parent lookup (accountNumber -> array of nodes with that number)
  const accountNumberMap = new Map();
  nodes.forEach(node => {
    const key = node._key;
    if (!accountNumberMap.has(key)) {
      accountNumberMap.set(key, []);
    }
    accountNumberMap.get(key).push(node);
  });

  // Step 3: Link each element to its closest parent (based on accountNumber as string)
  const roots = [];
  nodes.forEach(node => {
    let parentFound = false;
    const key = node._key;

    // Find the closest parent (longest existing prefix)
    for (let i = key.length - 1; i > 0; i--) {
      const parentKey = key.slice(0, i);
      if (accountNumberMap.has(parentKey)) {
        // Add to the first parent found (or could add to all parents if needed)
        const parents = accountNumberMap.get(parentKey);
        if (parents.length > 0) {
          parents[0].children.push(node);
          parentFound = true;
          break;
        }
      }
    }

    if (!parentFound) {
      roots.push(node);
    }
  });

  // Step 4: Sort each level numerically
  function sortTree(nodes) {
    nodes.sort((a, b) => {
      const aNum = String(a.accountNumber);
      const bNum = String(b.accountNumber);
      
      // First compare by accountNumber length (shorter = parent)
      if (aNum.length !== bNum.length) {
        return aNum.length - bNum.length;
      }
      
      // Then compare numerically
      const numCompare = aNum.localeCompare(bNum, undefined, { numeric: true });
      if (numCompare !== 0) {
        return numCompare;
      }
      
      // If same accountNumber, sort by ID to maintain stable order
      return a.id - b.id;
    });

    nodes.forEach(n => sortTree(n.children));
  }

  sortTree(roots);

  // Step 5: Flatten the tree into a single array
  const result = [];
  function flatten(nodes) {
    nodes.forEach(n => {
      // Remove children and _key from final result
      const { children, _key, ...nodeWithoutChildren } = n;
      result.push(nodeWithoutChildren);
      flatten(children);
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

    if (!level || accountNumber === undefined || accountNumber === null || !accountName) {
      throw { customMessage: "Level, Account Number, and Account Name are required", status: 400 };
    }

    // Check for duplicate accountNumber - prevent duplicates in manual create
    const existing = await prisma.accountGuide.findFirst({
      where: { accountNumber: Number(accountNumber) }
    });

    if (existing) {
      throw { 
        customMessage: `Account Number ${accountNumber} already exists (ID: ${existing.id})`, 
        status: 400 
      };
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
    const searchConditions = [
      { accountName: { contains: search } },
      { rulesAndRegulations: { contains: search } }
    ];
    
    // If search is a number, add accountNumber search condition
    const searchNumber = Number(search);
    if (!isNaN(searchNumber)) {
      searchConditions.push({ accountNumber: { equals: searchNumber } });
    }
    
    where.OR = searchConditions;
  }

  // Step 1: Fetch all filtered data WITHOUT pagination
  // Order by ID first to ensure stable ordering
  const allData = await prisma.accountGuide.findMany({
    where,
    orderBy: { id: 'asc' }
  });

  // Step 2: Apply tree sorting HERE
  const sortedData = treeSortAccountNumbers(allData);

  // Step 3: Apply pagination AFTER sorting
  const paginatedData = sortedData.slice(skip, skip + take);

  return {
    data: paginatedData,
    total: sortedData.length,
    page: pageNum,
    limit: take,
    totalPages: Math.ceil(sortedData.length / take)
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

    // Delete only the element (hierarchical relationship is for ordering only, not a real relationship)
    await prisma.accountGuide.delete({
      where: { id: Number(id) }
    });

    return { 
      message: "Account Guide entry deleted"
    };
  },

  // =========================
  // IMPORT EXCEL
  // =========================
  importExcel: async (file) => {
    const ExcelJS = require("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer);

    const sheet = wb.worksheets[0];
    if (!sheet) {
      throw { customMessage: "Excel sheet not found", status: 400 };
    }

    const rows = [];
    const errors = [];
    const duplicates = [];
    const seenAccountNumbers = new Set(); // Track duplicates within file
    const existingAccountNumbers = new Set(); // Track existing in DB

    // First pass: collect all rows and validate
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      try {
        const accountNumber = row.getCell(2)?.value;
        
        // Validate accountNumber exists and is valid
        if (!accountNumber && accountNumber !== 0) {
          errors.push({
            row: rowNumber,
            accountNumber: accountNumber || "N/A",
            error: "Account Number is required"
          });
          return;
        }

        const accountNum = Number(accountNumber);
        const rowData = {
          rowNumber,
          level: String(row.getCell(1)?.value || "").trim(),
          accountNumber: accountNum,
          accountName: String(row.getCell(3)?.value || "").trim(),
          rulesAndRegulations: row.getCell(4)?.value
            ? String(row.getCell(4).value).trim()
            : null,
          disclosureNotes: row.getCell(5)?.value
            ? String(row.getCell(5).value).trim()
            : null,
            code1: row.getCell(6)?.value
            ? String(row.getCell(6).value).trim()
            : null,
            objectiveCode: row.getCell(7)?.value
            ? String(row.getCell(7).value).trim()
            : null, 
        
        
          };

        // Check for duplicates within the file
        if (seenAccountNumbers.has(accountNum)) {
          duplicates.push({
            row: rowNumber,
            accountNumber: accountNum,
            accountName: rowData.accountName,
            error: "Duplicate account number in file"
          });
          return;
        }

        seenAccountNumbers.add(accountNum);
        rows.push(rowData);
      } catch (error) {
        errors.push({
          row: rowNumber,
          accountNumber: "N/A",
          error: error.message || "Invalid row data"
        });
      }
    });

    // Second pass: check existing in database (batch check for performance)
    if (rows.length > 0) {
      const accountNumbersToCheck = rows.map(r => r.accountNumber);
      const existing = await prisma.accountGuide.findMany({
        where: {
          accountNumber: { in: accountNumbersToCheck }
        },
        select: { accountNumber: true, id: true }
      });

      existing.forEach(ex => {
        existingAccountNumbers.add(ex.accountNumber);
      });

      // Filter out rows that already exist in DB
      const rowsToInsert = [];
      rows.forEach(row => {
        if (existingAccountNumbers.has(row.accountNumber)) {
          duplicates.push({
            row: row.rowNumber,
            accountNumber: row.accountNumber,
            accountName: row.accountName,
            error: "Account number already exists in database"
          });
        } else {
          rowsToInsert.push(row);
        }
      });

      // Third pass: insert valid rows
      let imported = 0;
      for (const rowData of rowsToInsert) {
        try {
          await prisma.accountGuide.create({
            data: {
              level: rowData.level,
              accountNumber: rowData.accountNumber,
              accountName: rowData.accountName,
              rulesAndRegulations: rowData.rulesAndRegulations,
              disclosureNotes: rowData.disclosureNotes,
              code1: rowData.code1,
              objectiveCode: rowData.objectiveCode,

            }
          });
          imported++;
        } catch (error) {
          errors.push({
            row: rowData.rowNumber,
            accountNumber: rowData.accountNumber,
            error: error.message || "Failed to insert"
          });
        }
      }

      return {
        imported,
        skipped: duplicates.length,
        errors: errors.length,
        details: {
          duplicates: duplicates,
          errors: errors
        }
      };
    }

    return {
      imported: 0,
      skipped: duplicates.length,
      errors: errors.length,
      details: {
        duplicates: duplicates,
        errors: errors
      }
    };
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
