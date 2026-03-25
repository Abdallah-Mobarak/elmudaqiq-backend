const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  // ===============================
  //  Create Complaint
  // ===============================
  create: async (data) => {
    const requiredFields = [
      "subscriberId",
      "subscriberName",
      "phone",
      "email",
      "message",
      "type",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        throw { status: 400, message: `${field} is required` };
      }
    }

    // يمكنك إضافة التحقق هنا بناءً على القيم الموجودة في الـ Enum الخاص بك
    const validTypes = ["TECHNICAL", "BILLING", "INQUIRY", "OTHER"]; // عدل هذه القائمة حسب الـ Schema الخاصة بك
    if (!validTypes.includes(data.type)) {
      throw { status: 400, message: `Invalid complaint type. Allowed values are: ${validTypes.join(", ")}` };
    }

    return prisma.complaint.create({
      data: {
        subscriberId: Number(data.subscriberId),
        subscriberName: data.subscriberName,
        phone: data.phone,
        email: data.email,
        message: data.message,
        type: data.type,
      },
    });
  },

  // ===============================
  //  View Complaints + Search + Filters
  // ===============================
  getAll: async (query) => {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      fromDate,
      toDate,
      subscriberId,
    } = query;

    const where = {};

    if (subscriberId) {
      where.subscriberId = Number(subscriberId);
    }

    if (search) {
      where.subscriberName = { contains: search };
    }

    if (type) {
      where.type = type;
    }

    if (fromDate || toDate) {
      where.complaintDate = {};
      if (fromDate) where.complaintDate.gte = new Date(fromDate);
      if (toDate) where.complaintDate.lte = new Date(toDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { complaintDate: "desc" },
        include: {
          subscriber: {
            select: {
              id: true,
              subdomain: true,
            },
          },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  },

  // ===============================
  // Respond To Complaint
  // ===============================
  respond: async (id, response) => {
    if (!response) {
      throw { status: 400, message: "Response is required" };
    }

    return prisma.complaint.update({
      where: { id: Number(id) },
      data: {
        response,
        respondedAt: new Date(),
      },
    });
  },

  // ===============================
  //  DELETE Complaint
  // ===============================
  delete: async (id) => {
    const exists = await prisma.complaint.findUnique({
      where: { id: Number(id) },
    });

    if (!exists) {
      throw { status: 404, message: "Complaint not found" };
    }

    await prisma.complaint.delete({
      where: { id: Number(id) },
    });

    return { message: "Complaint deleted successfully" };
  },

};
