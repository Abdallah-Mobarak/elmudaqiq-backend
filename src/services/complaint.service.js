const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const notify = require("../utils/notify");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../config/notificationTypes");

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

    const complaint = await prisma.complaint.create({
      data: {
        subscriberId: Number(data.subscriberId),
        subscriberName: data.subscriberName,
        phone: data.phone,
        email: data.email,
        message: data.message,
        type: data.type,
      },
    });

    // Notify all admins that a new complaint was submitted
    await notify.notifyAdmins({
      title: "شكوى جديدة",
      message: `تم استلام شكوى جديدة من ${complaint.subscriberName} (نوع: ${complaint.type}).`,
      type: NOTIFICATION_TYPES.COMPLAINT_SUBMITTED,
      entityType: ENTITY_TYPES.COMPLAINT,
      entityId: complaint.id,
    });

    return complaint;
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

    const updated = await prisma.complaint.update({
      where: { id: Number(id) },
      data: {
        response,
        respondedAt: new Date(),
      },
    });

    // Notify the subscriber owner that admin has replied (also via email)
    await notify.notifySubscriberOwner(updated.subscriberId, {
      title: "رد الإدارة على شكواك",
      message: "قامت الإدارة بالرد على الشكوى المقدمة منك. يرجى مراجعة الرد.",
      type: NOTIFICATION_TYPES.COMPLAINT_REPLIED,
      entityType: ENTITY_TYPES.COMPLAINT,
      entityId: updated.id,
      sendEmail: true,
    });

    return updated;
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
