const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  // Create manual notification (Admin)
  create: async (data) => {
    const { title, message, subscriberId, userId, type } = data;

    if (!title || !message || !type) {
      throw { status: 400, message: "title, message and type are required" };
    }

    return prisma.notification.create({
      data: {
        title,
        message,
        type,
        subscriberId: subscriberId ? Number(subscriberId) : null,
        userId: userId ? Number(userId) : null,
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

  // Get notifications for a specific user (with pagination + filter)
  getUserNotifications: async (userId, query = {}) => {
    const { page = 1, limit = 20, isRead } = query;

    const where = { userId: Number(userId) };
    if (isRead === "true") where.isRead = true;
    if (isRead === "false") where.isRead = false;

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  },

  // Get unread count for a user (for the badge)
  getUnreadCount: async (userId) => {
    const count = await prisma.notification.count({
      where: { userId: Number(userId), isRead: false },
    });
    return { count };
  },

  // Mark notification as read
  markAsRead: async (id, userId) => {
    // Only owner can mark their own notification as read
    const notif = await prisma.notification.findUnique({
      where: { id: Number(id) },
    });

    if (!notif) throw { status: 404, customMessage: "Notification not found" };
    if (userId && notif.userId && notif.userId !== Number(userId)) {
      throw { status: 403, customMessage: "Unauthorized" };
    }

    return prisma.notification.update({
      where: { id: Number(id) },
      data: { isRead: true },
    });
  },

  // Mark ALL my notifications as read
  markAllAsRead: async (userId) => {
    const result = await prisma.notification.updateMany({
      where: { userId: Number(userId), isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  },

};
