const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const hierarchicalSort = require("../utils/hierarchicalSort");

module.exports = {
  create: async (data) => {
    return prisma.reviewGuideTemplate.create({
      data: {
        level: data.level,
        separator: data.separator,
        number: data.number,
        statement: data.statement,
        purpose: data.purpose,
        responsiblePerson: data.responsiblePerson,
        datePrepared: data.datePrepared ? new Date(data.datePrepared) : null,
        dateReviewed: data.dateReviewed ? new Date(data.dateReviewed) : null,
        conclusion: data.conclusion,
        attachments: data.attachments,
        notes1: data.notes1,
        notes2: data.notes2,
        notes3: data.notes3
      }
    });
  },

  getAll: async (filters = {}) => {
    const { page = 1, limit = 20, search, level, id, number, statement, responsiblePerson, userRole } = filters;
    
    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const take = Number(limit) > 0 ? Number(limit) : 20;
    const skip = (pageNum - 1) * take;

    const where = {};

    if (id) where.id = Number(id);
    if (level) where.level = { contains: level };
    if (number) where.number = { contains: number };
    if (statement) where.statement = { contains: statement };

    // 🔒 Role-Based Visibility (الحماية بناءً على الدور)
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      where.responsiblePerson = { contains: userRole };
    } else if (responsiblePerson) {
      where.responsiblePerson = { contains: responsiblePerson };
    }

    if (search) {
      const s = String(search);
      where.OR = [
        { level: { contains: s } },
        { number: { contains: s } },
        { statement: { contains: s } },
        { purpose: { contains: s } },
        { responsiblePerson: { contains: s } },
        { conclusion: { contains: s } },
        { attachments: { contains: s } },
        { notes1: { contains: s } },
        { notes2: { contains: s } },
        { notes3: { contains: s } }
      ];
    }

    const allData = await prisma.reviewGuideTemplate.findMany({
      where,
      orderBy: { id: 'asc' }
    });

    let sortedData = [];

    // 🛑 تطبيق الشجرة الذكية للموظفين
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      const flatSorted = allData.sort((a, b) => {
        const numA = String(a.number || "");
        const numB = String(b.number || "");
        return numA.localeCompare(numB, undefined, { numeric: true });
      });

      const map = {};
      const tree = [];

      flatSorted.forEach(item => {
        map[item.number] = { ...item, children: [] };
      });

      flatSorted.forEach(item => {
        const node = map[item.number];
        const parts = String(item.number || "").split(".");
        parts.pop(); 

        let parentFound = false;
        while (parts.length > 0) {
          const parentNum = parts.join(".");
          if (map[parentNum]) {
            map[parentNum].children.push(node);
            parentFound = true;
            break;
          }
          parts.pop(); 
        }

        if (!parentFound) {
          tree.push(node);
        }
      });

      sortedData = tree;
    } else {
      sortedData = hierarchicalSort(allData, "number");
    }

    const paginatedData = sortedData.slice(skip, skip + take);

    return {
      data: paginatedData,
      meta: {
        total: sortedData.length,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(sortedData.length / take)
      }
    };
  },

  update: async (id, data) => {
    return prisma.reviewGuideTemplate.update({ where: { id: Number(id) }, data });
  },

  delete: async (id) => {
    return prisma.reviewGuideTemplate.delete({ where: { id: Number(id) } });
  },

  // ---------------- IMPORT EXCEL ----------------
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => ({
        level: row.getCell(2)?.value?.toString().trim() || null,
        separator: row.getCell(3)?.value?.toString().trim() || null,
        number: row.getCell(4)?.value?.toString().trim() || null,
        statement: row.getCell(5)?.value?.toString().trim() || null,
        purpose: row.getCell(6)?.value?.toString().trim() || null,
        responsiblePerson: row.getCell(7)?.value?.toString().trim() || null,
        datePrepared: row.getCell(8)?.value && !isNaN(new Date(row.getCell(8).value)) ? new Date(row.getCell(8).value) : null,
        dateReviewed: row.getCell(9)?.value && !isNaN(new Date(row.getCell(9).value)) ? new Date(row.getCell(9).value) : null,
        conclusion: row.getCell(10)?.value?.toString().trim() || null,
        attachments: row.getCell(11)?.value?.toString().trim() || null,
        notes1: row.getCell(12)?.value?.toString().trim() || null,
        notes2: row.getCell(13)?.value?.toString().trim() || null,
        notes3: row.getCell(14)?.value?.toString().trim() || null,
      }), 
      insertHandler: (row) => prisma.reviewGuideTemplate.create({ data: row })
    });
  },

  // ---------------- EXPORT EXCEL ----------------
  exportExcel: async (filters = {}) => {
    const { userRole } = filters;
    const where = {};

    // 🔒 Role-Based Visibility
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      where.responsiblePerson = { contains: userRole };
    }

    const data = await prisma.reviewGuideTemplate.findMany({ where, orderBy: { id: 'asc' } });

    return exportExcelUtil({
      headers: [
        "ID", "Level", "Separator", "Number", "Statement", "Purpose",
        "Responsible Person", "Date Prepared", "Date Reviewed",
        "Conclusion", "Attachments", "Notes 1", "Notes 2", "Notes 3"
      ],
      rows: data.map(i => [
        i.id, i.level, i.separator, i.number, i.statement, i.purpose,
        i.responsiblePerson, i.datePrepared, i.dateReviewed,
        i.conclusion, i.attachments, i.notes1, i.notes2, i.notes3
      ]),
      filePrefix: "review_guide_template"
    });
  }
};