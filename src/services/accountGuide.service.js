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
  create: async (data, subscriberId) => {
    const { level, accountNumber, accountName } = data;

    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

    if (!level || accountNumber === undefined || accountNumber === null || !accountName) {
      throw { customMessage: "Level, Account Number, and Account Name are required", status: 400 };
    }

    // Check for duplicate accountNumber - prevent duplicates in manual create
    const existing = await prisma.accountGuide.findFirst({
      where: { 
        accountNumber: Number(accountNumber),
        subscriberId: Number(subscriberId) // Check within tenant only
      }
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
        accountNumber: Number(accountNumber),
        subscriberId: Number(subscriberId) // Add subscriberId
      }
    });

    return { message: "Account Guide entry created", item };
  },

  // =========================
  // GET ALL + FILTER
  // =========================
getAll: async (filters = {}, subscriberId) => {
  const { page = 1, limit = 20, search, level, id } = filters;

  if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

  const pageNum = Number(page);
  const take = Number(limit);
  const skip = (pageNum - 1) * take;

  const where = {
    subscriberId: Number(subscriberId) // Filter by tenant
  };

  if (id) where.id = Number(id);
  if (level) where.level = level;

  if (search) {
    const s = String(search);
    const searchConditions = [
      { level: { contains: s } },
      { accountName: { contains: s } },
      { rulesAndRegulations: { contains: s } },
      { disclosureNotes: { contains: s } },
      { code1: { contains: s } },
      { code2: { contains: s } },
      { code3: { contains: s } },
      { code4: { contains: s } },
      { code5: { contains: s } },
      { code6: { contains: s } },
      { code7: { contains: s } },
      { code8: { contains: s } },
      { objectiveCode: { contains: s } },
      { relatedObjectives: { contains: s } }
    ];

    const searchNumber = Number(s);
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
  update: async (id, data, subscriberId) => {
    const exists = await prisma.accountGuide.findFirst({
      where: { 
        id: Number(id),
        subscriberId: Number(subscriberId) // Ensure ownership
      }
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
  delete: async (id, subscriberId) => {
    const exists = await prisma.accountGuide.findFirst({
      where: { 
        id: Number(id),
        subscriberId: Number(subscriberId) // Ensure ownership
      }
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
  importExcel: async (file, subscriberId) => {
    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

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
        // Helper to safely extract value from any cell (handling Formulas & RichText)
        const getVal = (colIndex) => {
          const val = row.getCell(colIndex).value;
          if (val && typeof val === 'object') {
            if (val.result !== undefined) return val.result;
            if (val.richText) return val.richText.map(t => t.text).join('');
            if (val.text) return val.text;
          }
          return val;
        };

        const accountNumberVal = getVal(2);
        
        // Validate accountNumber exists and is valid
        if (accountNumberVal === null || accountNumberVal === undefined || String(accountNumberVal).trim() === '') {
          errors.push({
            row: rowNumber,
            accountNumber: "N/A",
            error: "Account Number is required"
          });
          return;
        }

        const accountNum = Number(accountNumberVal);

        if (isNaN(accountNum)) {
           errors.push({
            row: rowNumber,
            accountNumber: String(accountNumberVal),
            error: "Invalid Account Number format"
          });
          return;
        }

        const rowData = {
          rowNumber,
          level: String(getVal(1) || "").trim(),
          accountNumber: accountNum,
          accountName: String(getVal(3) || "").trim(),
          rulesAndRegulations: getVal(4)
            ? String(getVal(4)).trim()
            : null,
          disclosureNotes: getVal(5)
            ? String(getVal(5)).trim()
            : null,
            code1: getVal(6)
            ? String(getVal(6)).trim()
            : null,
            objectiveCode: getVal(7)
            ? String(getVal(7)).trim()
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
          accountNumber: { in: accountNumbersToCheck },
          subscriberId: Number(subscriberId)
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
              subscriberId: Number(subscriberId)
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
  exportExcel: async (filters = {}, subscriberId) => {
    const where = {
      subscriberId: Number(subscriberId)
    };

    if (filters.id) where.id = Number(filters.id);
    if (filters.level) where.level = filters.level;

    if (filters.search) {
      const s = String(filters.search);
      const searchConditions = [
        { level: { contains: s } },
        { accountName: { contains: s } },
        { rulesAndRegulations: { contains: s } },
        { disclosureNotes: { contains: s } },
        { code1: { contains: s } },
        { code2: { contains: s } },
        { code3: { contains: s } },
        { code4: { contains: s } },
        { code5: { contains: s } },
        { code6: { contains: s } },
        { code7: { contains: s } },
        { code8: { contains: s } },
        { objectiveCode: { contains: s } },
        { relatedObjectives: { contains: s } }
      ];

      const searchNumber = Number(s);
      if (!isNaN(searchNumber)) {
        searchConditions.push({ accountNumber: { equals: searchNumber } });
      }

      where.OR = searchConditions;
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
  exportPDF: async (filters = {}, subscriberId) => {

  const where = {
    subscriberId: Number(subscriberId)
  };

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
    const s = String(filters.search);
    const searchConditions = [
      { level: { contains: s } },
      { accountName: { contains: s } },
      { rulesAndRegulations: { contains: s } },
      { disclosureNotes: { contains: s } },
      { code1: { contains: s } },
      { code2: { contains: s } },
      { code3: { contains: s } },
      { code4: { contains: s } },
      { code5: { contains: s } },
      { code6: { contains: s } },
      { code7: { contains: s } },
      { code8: { contains: s } },
      { objectiveCode: { contains: s } },
      { relatedObjectives: { contains: s } }
    ];

    const searchNumber = Number(s);
    if (!isNaN(searchNumber)) {
      searchConditions.push({ accountNumber: { equals: searchNumber } });
    }

    where.OR = searchConditions;
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
