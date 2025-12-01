const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ===============================
//  Create Complaint
// ===============================
exports.create = async (data) => {
  const requiredFields = [
    "subscriberId",
    "subscriberName",
    "phone",
    "email",
    "message",
    "type", // COMMERCIAL | TECHNICAL
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      throw { status: 400, message: `${field} is required` };
    }
  }

  return prisma.complaint.create({
    data: {
      subscriberId: Number(data.subscriberId),
      subscriberName: data.subscriberName,
      phone: data.phone,
      email: data.email,
      message: data.message,
      type: data.type, // COMMERCIAL | TECHNICAL
    },
  });
};

// ===============================
//  View Complaints + Search + Filters
// ===============================
exports.getAll = async (query) => {
  const {
    page = 1,
    limit = 10,
    search,   // by subscriberName
    type,     // COMMERCIAL / TECHNICAL
    fromDate,
    toDate,
  } = query;

  const where = {};

  if (search) {
    where.subscriberName = {
      contains: search,
    };
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

  return {
    data,
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

// ===============================
// Respond To Complaint
// ===============================
exports.respond = async (id, response) => {
  if (!response) {
    throw {
      status: 400,
      message: "Response is required",
    };
  }

  return prisma.complaint.update({
    where: { id: Number(id) },
    data: {
      response,
      respondedAt: new Date(),
    },
  });
};
