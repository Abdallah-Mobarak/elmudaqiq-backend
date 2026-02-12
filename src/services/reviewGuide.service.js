const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPdf");

module.exports = {

  // ---------------- CREATE ---------------- //
  create: async (data) => {
    const item = await prisma.reviewGuide.create({
      data: {
        ...data,
        datePrepared: data.datePrepared ? new Date(data.datePrepared) : null,
        dateReviewed: data.dateReviewed ? new Date(data.dateReviewed) : null,
      }
    });

    return { message: "Review Guide entry created", item };
  },

  // ---------------- GET ALL (Filters + Pagination) ---------------- //
  getAll: async (filters = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      level,
      number,
      statement,
      responsiblePerson,
      id
    } = filters;

    const skip = (page - 1) * limit;

    const where = {};

    if (id) where.id = Number(id);
    if (level) where.level = { contains: level};
    if (number) where.number = { contains: number,};
    if (statement) where.statement = { contains: statement,};
    if (responsiblePerson) {
      where.responsiblePerson = { contains: responsiblePerson,};
    }

    if (search) {
      const s = String(search);
      where.OR = [
        { level: { contains: s,} },
        { number: { contains: s} },
        { statement: { contains: s,  } },
        { purpose: { contains: s, } },
        { responsiblePerson: { contains: s,} },
        { conclusion: { contains: s,  } },
        { attachments: { contains: s,   } },
        { notes1: { contains: s,  } },
        { notes2: { contains: s,  } },
        { notes3: { contains: s,  } },
      ];
    }

    const data = await prisma.reviewGuide.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { id: "desc" }
    });

    const total = await prisma.reviewGuide.count({ where });

    return { data, total };
  },

  // ---------------- GET ONE ---------------- //
  getOne: async (id) => {
    const item = await prisma.reviewGuide.findUnique({
      where: { id: Number(id) }
    });

    if (!item) throw { customMessage: "Review Guide entry not found", status: 404 };
    return item;
  },

  // ---------------- UPDATE ---------------- //
  update: async (id, data) => {
    const exists = await prisma.reviewGuide.findUnique({
      where: { id: Number(id) }
    });

    if (!exists) throw { customMessage: "Review Guide entry not found", status: 404 };

    const updated = await prisma.reviewGuide.update({
      where: { id: Number(id) },
      data
    });

    return { message: "Review Guide entry updated", updated };
  },

  // ---------------- DELETE ---------------- //
  delete: async (id) => {
    const exists = await prisma.reviewGuide.findUnique({
      where: { id: Number(id) }
    });

    if (!exists) throw { customMessage: "Review Guide entry not found", status: 404 };

    await prisma.reviewGuide.delete({ where: { id: Number(id) } });

    return { message: "Review Guide entry deleted" };
  },

  // ---------------- IMPORT EXCEL ---------------- //
  importExcel: async (file) => {
    return importExcelUtil({
      fileBuffer: file,
      rowMapper: (row) => {
        // Excel columns order: ID, Level, Separator, Number, Statement, Purpose, Responsible Person, Date Prepared, Date Reviewed, Conclusion, Attachments, Notes 1, Notes 2, Notes 3
        return {
          level: row.getCell(2)?.value?.toString().trim() || null,
          separator: row.getCell(3)?.value?.toString().trim() || null,
          number: row.getCell(4)?.value?.toString().trim() || null,
          statement: row.getCell(5)?.value?.toString().trim() || null,
          purpose: row.getCell(6)?.value?.toString().trim() || null,
          responsiblePerson: row.getCell(7)?.value?.toString().trim() || null,
          datePrepared: row.getCell(8)?.value ? new Date(row.getCell(8).value) : null,
          dateReviewed: row.getCell(9)?.value ? new Date(row.getCell(9).value) : null,
          conclusion: row.getCell(10)?.value?.toString().trim() || null,
          attachments: row.getCell(11)?.value?.toString().trim() || null,
          notes1: row.getCell(12)?.value?.toString().trim() || null,
          notes2: row.getCell(13)?.value?.toString().trim() || null,
          notes3: row.getCell(14)?.value?.toString().trim() || null,
        };
      },
      insertHandler: (row) => prisma.reviewGuide.create({ data: row })
    });
  },

  // ---------------- EXPORT EXCEL (Filters + id + multi-ids) ---------------- //
  exportExcel: async (filters = {}) => {
    const { ids, id } = filters;

    const where = {};

    if (id) where.id = Number(id);

    if (ids) {
      const arr = ids.split(",").map(n => Number(n));
      where.id = { in: arr };
    }

    const data = await prisma.reviewGuide.findMany({ where });

    return exportExcelUtil({
      headers: [
        "ID", "Level", "Separator", "Number", "Statement", "Purpose",
        "Responsible Person", "Date Prepared", "Date Reviewed",
        "Conclusion", "Attachments", "Notes 1", "Notes 2", "Notes 3"
      ],
      rows: data.map(i => [
        i.id,
        i.level,
        i.separator,
        i.number,
        i.statement,
        i.purpose,
        i.responsiblePerson,
        i.datePrepared,
        i.dateReviewed,
        i.conclusion,
        i.attachments,
        i.notes1,
        i.notes2,
        i.notes3
      ]),
      filePrefix: "review_guide"
    });
  },

  // ---------------- EXPORT PDF (Filters + id + multi-ids) ---------------- //
  exportPDF: async (filters = {}) => {
    const { ids, id } = filters;

    const where = {};
    if (id) where.id = Number(id);

    if (ids) {
      const arr = ids.split(",").map(n => Number(n));
      where.id = { in: arr };
    }

    const data = await prisma.reviewGuide.findMany({ where });

    return exportPDFUtil({
      title: "Review Guide Report",
      headers: [
        { label: "Level", width: 60 },
        { label: "Separator", width: 60 },
        { label: "Number", width: 60 },
        { label: "Statement", width: 120 },
        { label: "Purpose", width: 100 },
        { label: "Responsible", width: 100 },
        { label: "Prepared", width: 70 },
        { label: "Reviewed", width: 70 }
      ],
      rows: data.map(i => [
        i.level,
        i.separator,
        i.number,
        i.statement,
        i.purpose,
        i.responsiblePerson,
        i.datePrepared,
        i.dateReviewed
      ]),
      filePrefix: "review_guide"
    });
  }

};
