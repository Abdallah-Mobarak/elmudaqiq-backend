const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    const item = await prisma.accountGuide.findUnique({
      where: { id: Number(id) }
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
  }

};
