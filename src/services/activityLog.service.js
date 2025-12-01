const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  create: async (data) => {
    const {
      userId,
      subscriberId,
      userType,
      action,
      message,
      ipAddress,
      userAgent,
    } = data;

    return prisma.activityLog.create({
      data: {
        userId: userId ? Number(userId) : null,
        subscriberId: subscriberId ? Number(subscriberId) : null,
        userType,      // ADMIN | SUBSCRIBER
        action,        // LOGIN | CREATE | UPDATE | SEND_NOTIFICATION
        message,
        ipAddress,
        userAgent,
      },
    });
  },

  getAll: async () => {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
        subscriber: {
          select: { id: true, licenseName: true },
        },
      },
    });
  }

};
