const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  // Create manual notification (Admin)
  create: async (data) => {
    const { title, message, subscriberId, type } = data;

    if (!title || !message || !type) {
      throw { status: 400, message: "title, message and type are required" };
    }

    return prisma.notification.create({
      data: {
        title,
        message,
        type,
        subscriberId: subscriberId ? Number(subscriberId) : null,
      },
    });
  },

  // Get all admin notifications
  getAll: async () => {
    return prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscriber: {
          select: {
            id: true,
            licenseName: true,
          },
        },
      },
    });
  },

  // Mark notification as read
  markAsRead: async (id) => {
    return prisma.notification.update({
      where: { id: Number(id) },
      data: { isRead: true },
    });
  }

};
