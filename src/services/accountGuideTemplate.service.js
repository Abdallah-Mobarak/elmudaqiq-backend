const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");

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

  getAll: async () => {
    return prisma.accountGuideTemplate.findMany({
      orderBy: { accountNumber: 'asc' }
    });
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
