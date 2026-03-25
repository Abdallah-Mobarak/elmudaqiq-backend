const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const importExcelUtil = require("../utils/fileHandlers/importExcel");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPdf");
const hierarchicalSort = require("../utils/hierarchicalSort");

module.exports = {

  // ---------------- CREATE ---------------- //
  create: async (data, subscriberId) => {
    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

    const item = await prisma.reviewGuide.create({
      data: {
        ...data,
        subscriberId: Number(subscriberId),
        datePrepared: data.datePrepared ? new Date(data.datePrepared) : null,
        dateReviewed: data.dateReviewed ? new Date(data.dateReviewed) : null,
      }
    });

    return { message: "Review Guide entry created", item };
  },

  // ---------------- GET ALL (Filters + Pagination) ---------------- //
  getAll: async (filters = {}, subscriberId) => {
    const {
      page = 1,
      limit = 20,
      search,
      level,
      number,
      statement,
      responsiblePerson,
      id,
      userRole
    } = filters;
  
    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };
  
    const skip = (page - 1) * limit;
  
    // Base filter: always scope data to the current subscriber
    const where = { subscriberId: Number(subscriberId) };
  
    // Optional filters
    if (id)        where.id        = Number(id);
    if (level)     where.level     = { contains: level };
    if (number)    where.number    = { contains: number };
    if (statement) where.statement = { contains: statement };
  
    // Regular users only see records assigned to their role
    // Admins and owners can see everything (or filter by responsiblePerson manually)
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      where.responsiblePerson = userRole;
    } else if (responsiblePerson) {
      where.responsiblePerson = { contains: responsiblePerson };
    }
  
    // Search across all text fields
    if (search) {
      const s = String(search);
      where.OR = [
        { level:             { contains: s } },
        { number:            { contains: s } },
        { statement:         { contains: s } },
        { purpose:           { contains: s } },
        { responsiblePerson: { contains: s } },
        { conclusion:        { contains: s } },
        { attachments:       { contains: s } },
        { notes1:            { contains: s } },
        { notes2:            { contains: s } },
        { notes3:            { contains: s } },
      ];
    }
  
    const allData = await prisma.reviewGuide.findMany({
      where,
      orderBy: { id: "asc" }
    });
  
    // Converts a nested tree back into a flat ordered list
    function flattenTree(nodes) {
      const result = [];
      for (const node of nodes) {
        const { children, ...item } = node;
        result.push(item);
        if (children?.length > 0) {
          result.push(...flattenTree(children));
        }
      }
      return result;
    }
  
    let sortedData = [];
  
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      // Sort numerically by number field
      const flatSorted = allData.sort((a, b) =>
        String(a.number || "").localeCompare(String(b.number || ""), undefined, { numeric: true })
      );
  
      // Build a lookup map for quick parent search
      const map = {};
      flatSorted.forEach(item => {
        map[item.number] = { ...item, children: [] };
      });
  
      const tree = [];
  
      // Place each item under its closest parent, or at root if no parent found
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
  
        if (!parentFound) tree.push(node);
      });
  
      // Flatten tree to preserve hierarchy order for pagination
      sortedData = flattenTree(tree);
  
    } else {
      // Full hierarchical sort for admins and owners
      sortedData = hierarchicalSort(allData, "number");
    }
  
    const paginatedData = sortedData.slice(skip, skip + Number(limit));
  
    return { data: paginatedData, total: sortedData.length };
  },

  // ---------------- GET ONE ---------------- //
  getOne: async (id, userRole) => {
    const where = { id: Number(id) };

    // 🔒 Role-Based Visibility (الحماية بناءً على الدور)
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      where.responsiblePerson = userRole;
    }

    const item = await prisma.reviewGuide.findFirst({
      where
    });

    if (!item) throw { customMessage: "Review Guide entry not found", status: 404 };
    return item;
  },

  // ---------------- UPDATE ---------------- //
  update: async (id, data, subscriberId) => {
    const exists = await prisma.reviewGuide.findFirst({
      where: { 
        id: Number(id),
        subscriberId: Number(subscriberId)
      }
    });

    if (!exists) throw { customMessage: "Review Guide entry not found", status: 404 };

    const updated = await prisma.reviewGuide.update({
      where: { id: Number(id) },
      data
    });

    return { message: "Review Guide entry updated", updated };
  },

  // ---------------- DELETE ---------------- //
  delete: async (id, subscriberId) => {
    const exists = await prisma.reviewGuide.findFirst({
      where: { 
        id: Number(id),
        subscriberId: Number(subscriberId)
      }
    });

    if (!exists) throw { customMessage: "Review Guide entry not found", status: 404 };

    await prisma.reviewGuide.delete({ where: { id: Number(id) } });

    return { message: "Review Guide entry deleted" };
  },

  // ---------------- IMPORT EXCEL ---------------- //
  importExcel: async (file, subscriberId) => {
    if (!subscriberId) throw { status: 400, customMessage: "Subscriber ID is required" };

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
      insertHandler: (row) => prisma.reviewGuide.create({ data: { ...row, subscriberId: Number(subscriberId) } })
    });
  },

  // ---------------- EXPORT EXCEL (Filters + id + multi-ids) ---------------- //
  exportExcel: async (filters = {}, subscriberId) => {
    const { ids, id, userRole } = filters;

    const where = {
      subscriberId: Number(subscriberId)
    };

    if (id) where.id = Number(id);

    if (ids) {
      const arr = ids.split(",").map(n => Number(n));
      where.id = { in: arr };
    }

    // 🔒 Role-Based Visibility
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      where.responsiblePerson = userRole;
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
  exportPDF: async (filters = {}, subscriberId) => {
    const { ids, id, userRole } = filters;

    const where = {
      subscriberId: Number(subscriberId)
    };
    if (id) where.id = Number(id);

    if (ids) {
      const arr = ids.split(",").map(n => Number(n));
      where.id = { in: arr };
    }

    // 🔒 Role-Based Visibility
    if (userRole && !["SUBSCRIBER_OWNER", "ADMIN"].includes(userRole)) {
      where.responsiblePerson = userRole;
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
