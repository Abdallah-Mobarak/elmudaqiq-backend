const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const hierarchicalSort = require("../utils/hierarchicalSort");

module.exports = {
  create: async (data) => {
    return prisma.accountGuideTemplate.create({
      data: {
        level: String(data.level),
        accountNumber: Number(data.accountNumber),
        accountName: data.accountName,
        rulesAndRegulations: data.rulesAndRegulations,
        disclosureNotes: data.disclosureNotes,
        code1: data.code1,
        code2: data.code2,
        code3: data.code3,
        code4: data.code4,
        code5: data.code5,
        code6: data.code6,
        code7: data.code7,
        code8: data.code8,
        objectiveCode: data.objectiveCode,
        relatedObjectives: data.relatedObjectives
      }
    });
  },

  getAll: async (filters = {}) => {
    const { page = 1, limit = 20, search, level, id } = filters;

    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * take;

    const where = {};

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

    const allData = await prisma.accountGuideTemplate.findMany({
      where,
      orderBy: { id: 'asc' }
    });

    const sortedData = hierarchicalSort(allData, "accountNumber");
    const paginatedData = sortedData.slice(skip, skip + take);

    return {
      data: paginatedData,
      total: sortedData.length,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(sortedData.length / take)
    };
  },

  update: async (id, data) => {
    return prisma.accountGuideTemplate.update({
      where: { id: Number(id) },
      data
    });
  },

  delete: async (id) => {
    return prisma.accountGuideTemplate.delete({
      where: { id: Number(id) }
    });
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => ({
        level: row.getCell(1)?.value?.toString().trim() || "1",
        accountNumber: Number(row.getCell(2)?.value),
        accountName: row.getCell(3)?.value?.toString().trim() || "",
        rulesAndRegulations: row.getCell(4)?.value?.toString().trim() || null,
        disclosureNotes: row.getCell(5)?.value?.toString().trim() || null,
        code1: row.getCell(6)?.value?.toString().trim() || null,
        objectiveCode: row.getCell(7)?.value?.toString().trim() || null,
      }),
      insertHandler: (row) => {
        if (!row.accountNumber || isNaN(row.accountNumber)) return; // Skip invalid rows
        return prisma.accountGuideTemplate.create({ data: row });
      }
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async () => {
    const data = await prisma.accountGuideTemplate.findMany({
      orderBy: { accountNumber: 'asc' }
    });

    return exportExcelUtil({
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
        "Related Objectives"
      ],
      rows: data.map(i => [
        i.id, i.level, i.accountNumber, i.accountName,
        i.rulesAndRegulations, i.disclosureNotes,
        i.code1, i.code2, i.code3, i.code4,
        i.code5, i.code6, i.code7, i.code8,
        i.objectiveCode, i.relatedObjectives
      ]),
      filePrefix: "account_guide_template"
    });
  }
};
