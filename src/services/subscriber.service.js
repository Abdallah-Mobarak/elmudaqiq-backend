const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
// ===============================
// Utils
// ===============================
const generateSubdomain = (name) => {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `www.almudaqiq.${clean}.com`;
};

const getFile = (files, name) => files?.[name]?.[0]?.path || null;

// ===============================
// Add Subscriber
// ===============================
exports.create = async (data, files) => {
  const requiredFields = [
    "countryId",
    "cityId",
    "regionId",
    "licenseType",
    "licenseNumber",
    "licenseDate",
    "licenseName",
    "legalEntityType",
    "legalEntityNationality",
    "ownersNames",
    "commercialRegisterNumber",
    "taxNumber",
    "unifiedNumber",
    "commercialRegisterDate",
    "fiscalYear",
    "subscriberEmail",
    "primaryMobile",
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      throw { status: 400, message: `${field} is required` };
    }
  }

  const existing = await prisma.subscriber.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });

  if (existing) {
    throw { status: 400, message: "License already exists" };
  }

  const subdomain = generateSubdomain(data.licenseName);

  return prisma.subscriber.create({
    data: {
      countryId: Number(data.countryId),
      cityId: Number(data.cityId),
      regionId: Number(data.regionId),

      licenseType: data.licenseType,
      licenseNumber: data.licenseNumber,
      licenseCertificate: getFile(files, "licenseCertificate"),
      licenseDate: new Date(data.licenseDate),
      licenseName: data.licenseName,

      legalEntityType: data.legalEntityType,
      legalEntityNationality: data.legalEntityNationality,

      articlesOfAssociationFile: getFile(files, "articlesOfAssociationFile"),
      commercialRegisterFile: getFile(files, "commercialRegisterFile"),
      ownersNames: data.ownersNames,
      commercialRegisterNumber: data.commercialRegisterNumber,

      taxNumber: data.taxNumber,
      taxCertificateFile: getFile(files, "taxCertificateFile"),

      unifiedNumber: data.unifiedNumber,
      unifiedNumberFile: getFile(files, "unifiedNumberFile"),

      commercialActivityFile: getFile(files, "commercialActivityFile"),
      commercialRegisterDate: new Date(data.commercialRegisterDate),
      fiscalYear: new Date(data.fiscalYear),

      subscriberEmail: data.subscriberEmail,
      primaryMobile: data.primaryMobile,

      status: "PENDING",
      subscriptionDate: data.subscriptionDate
        ? new Date(data.subscriptionDate)
        : null,

      subscriptionType: data.subscriptionType || null,
      subscriptionStartDate: data.subscriptionStartDate
        ? new Date(data.subscriptionStartDate)
        : null,
      subscriptionEndDate: data.subscriptionEndDate
        ? new Date(data.subscriptionEndDate)
        : null,

      paidFees: data.paidFees ? Number(data.paidFees) : null,
      paymentMethod: data.paymentMethod || null,
      numberOfUsers: data.numberOfUsers
        ? Number(data.numberOfUsers)
        : null,
      numberOfClients: data.numberOfClients
        ? Number(data.numberOfClients)
        : null,
      numberOfBranches: data.numberOfBranches
        ? Number(data.numberOfBranches)
        : null,

      facilityLink: data.facilityLink || null,
      factoryLogo: getFile(files, "factoryLogo"),
      language: data.language || null,
      currency: data.currency || null,

      internalNotes: data.internalNotes || null,
      subdomain,
    },
  });
};

// ===============================
// View Subscribers + Filters
// ===============================
exports.getAll = async (query) => {
  const { page = 1, limit = 10, status, countryId, cityId, regionId } = query;

  const where = {};

  if (status) where.status = { in: status.split(",") };
  if (countryId) where.countryId = Number(countryId);
  if (cityId) where.cityId = Number(cityId);
  if (regionId) where.regionId = Number(regionId);

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscriber.count({ where }),
  ]);

  return { data, total };
};

// ===============================
// Update Subscriber (Editable Only)
// ===============================
exports.update = async (id, data, files) => {
  const updateData = {};

  // ✅ Editable Text Fields
  if (data.taxNumber !== undefined)
    updateData.taxNumber = data.taxNumber;

  if (data.unifiedNumber !== undefined)
    updateData.unifiedNumber = data.unifiedNumber;

  if (data.subscriberEmail !== undefined)
    updateData.subscriberEmail = data.subscriberEmail;

  if (data.primaryMobile !== undefined)
    updateData.primaryMobile = data.primaryMobile;

  if (data.facilityLink !== undefined)
    updateData.facilityLink = data.facilityLink;

  if (data.language !== undefined)
    updateData.language = data.language;

  if (data.currency !== undefined)
    updateData.currency = data.currency;

  if (data.internalNotes !== undefined)
    updateData.internalNotes = data.internalNotes;

  // ✅ Editable Files (Only if uploaded)
  const getFile = (name) => files?.[name]?.[0]?.path;

  if (getFile("taxCertificateFile"))
    updateData.taxCertificateFile = getFile("taxCertificateFile");

  if (getFile("unifiedNumberFile"))
    updateData.unifiedNumberFile = getFile("unifiedNumberFile");

  if (getFile("commercialActivityFile"))
    updateData.commercialActivityFile = getFile("commercialActivityFile");

  if (getFile("factoryLogo"))
    updateData.factoryLogo = getFile("factoryLogo");

  // ✅ Final Update
  return prisma.subscriber.update({
    where: { id: Number(id) },
    data: updateData,
  });
};


// ===============================
// Change Status (بدل Delete)
// ===============================
exports.changeStatus = async (id, status) => {
  return prisma.subscriber.update({
    where: { id: Number(id) },
    data: { status },
  });
};
