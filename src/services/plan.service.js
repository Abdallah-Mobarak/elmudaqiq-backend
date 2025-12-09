const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  // ===============================
  //  CREATE PLAN
  // ===============================
  createPlan: async (data) => {
    return await prisma.plan.create({
      data: {
        name: data.name,
        description: data.description,
        durationMonths: Number(data.durationMonths),
        paidFees: Number(data.paidFees),
        usersLimit: Number(data.usersLimit),
        fileLimit: Number(data.fileLimit),
        maxFileSizeMB: data.maxFileSizeMB ? Number(data.maxFileSizeMB) : null,
        branchesLimit: Number(data.branchesLimit),
      },
    });
  },

  // ===============================
  //  GET ALL ACTIVE PLANS
  // ===============================
  getAllPlans: async () => {
    return await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  // ===============================
  //  GET PLAN BY ID
  // ===============================
  getPlanById: async (id) => {
    return await prisma.plan.findUnique({
      where: {
        id: Number(id),
      },
    });
  },

  // ===============================
  //  UPDATE PLAN
  // ===============================
  updatePlan: async (id, data) => {
    return await prisma.plan.update({
      where: {
        id: Number(id),
      },
      data: {
        name: data.name,
        description: data.description,
        durationMonths: Number(data.durationMonths),
        paidFees: Number(data.paidFees),
        usersLimit: Number(data.usersLimit),
        fileLimit: Number(data.fileLimit),
        maxFileSizeMB: data.maxFileSizeMB ? Number(data.maxFileSizeMB) : null,
        branchesLimit: Number(data.branchesLimit),
      },
    });
  },

  // ===============================
  //  SOFT DELETE PLAN (DEACTIVATE)
  // ===============================
  deletePlan: async (id) => {
    return await prisma.plan.update({
      where: {
        id: Number(id),
      },
      data: {
        isActive: false,
      },
    });
  },
};
