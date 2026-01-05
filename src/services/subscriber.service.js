const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const saveUploadedFile = require("../utils/saveUploadedFile");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPdf");

// ===============================
// Utils
// ===============================
const generateUniqueSubdomain = async (name) => {
  let clean = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!clean) clean = "subscriber";

  let attempt = 0;

  while (true) {
    const suffix = attempt === 0 ? "" : `-${attempt}`;
    const subdomain = `www.almudaqiq.${clean}${suffix}.com`;

    const existing = await prisma.subscriber.findUnique({
      where: { subdomain },
    });

    if (!existing) {
      return subdomain;
    }

    attempt++;
  }
};


function buildIdFilter(id) {
  if (!id) return null;

  if (typeof id === "string" && id.includes(",")) {
    return {
      in: id
        .split(",")
        .map(n => Number(n.trim()))
        .filter(n => !isNaN(n)),
    };
  }

  const single = Number(id);
  if (!isNaN(single)) return single;

  return null;
}

const getFile = (files, name) => files?.[name]?.[0]?.path || null;

// ===============================
// Add Subscriber ( WITH PLAN - NO PAYMENT)
// ===============================
exports.create = async (data, files) => {
  const requiredFields = [
    "countryId",
    "cityId",
   // "regionId",
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
    "commercialExpireDate",
    "fiscalYear",
    "subscriberEmail",
    "primaryMobile",
    "planId" //  REQUIRED
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

  // ===============================
  //  GET PLAN & CALCULATE END DATE
  // ===============================
  const plan = await prisma.plan.findUnique({
    where: { id: Number(data.planId) }
  });

  if (!plan) {
    throw { status: 400, message: "Invalid Plan ID" };
  }

  let subscriptionEndDate = null;

  if (data.subscriptionStartDate) {
    subscriptionEndDate = new Date(data.subscriptionStartDate);
    subscriptionEndDate.setMonth(
      subscriptionEndDate.getMonth() + Number(plan.durationMonths)
    );
  }

  const subdomain = await generateUniqueSubdomain(data.licenseName);

  const subscriber = await prisma.subscriber.create({
    data: {
      country: {
        connect: { id: Number(data.countryId) },
      },
      city: {
        connect: { id: Number(data.cityId) },
      },

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

      commercialActivityFile: getFile(files, "commercialActivityFile"),
      commercialRegisterDate: new Date(data.commercialRegisterDate),
      commercialExpireDate: data.commercialExpireDate
        ? new Date(data.commercialExpireDate)
        : null,

      fiscalYear: new Date(data.fiscalYear),

      subscriberEmail: data.subscriberEmail,
      primaryMobile: data.primaryMobile,

      status: "PENDING",

      plan: {
        connect: {
          id: Number(data.planId),
        },
      },

      subscriptionStartDate: data.subscriptionStartDate
        ? new Date(data.subscriptionStartDate)
        : null,
      subscriptionEndDate,

      facilityLink: data.facilityLink || null,
      factoryLogo: getFile(files, "factoryLogo"),
      language: data.language || null,
      currency: data.currency || null,

      internalNotes: data.internalNotes || null,
      subdomain,
    },
  });

  //   uploaded 
  await saveUploadedFile({
    file: files?.licenseCertificate?.[0],
    source: "subscriber",
  });

  await saveUploadedFile({
    file: files?.taxCertificateFile?.[0],
    source: "subscriber",
  });

  await saveUploadedFile({
    file: files?.commercialActivityFile?.[0],
    source: "subscriber",
  });

  await saveUploadedFile({
    file: files?.factoryLogo?.[0],
    source: "subscriber",
  });

  return subscriber;
};

// ===============================
// View Subscribers + Filters ( WITH PLAN)
// ===============================
exports.getAll = async (query) => {
  const {
    page = 1,
    limit = 10,
    status,
    countryId,
    cityId,
    // regionId,
  } = query;

  const where = {};

  if (status) where.status = { in: status.split(",") };
  if (countryId) where.countryId = Number(countryId);
  if (cityId) where.cityId = Number(cityId);

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },

      include: {
        country: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },

        // INCLUDE PLAN
        plan: {
          select: {
            id: true,
            name: true,
            durationMonths: true,
            paidFees: true,
            usersLimit: true,
            fileLimit: true,
            maxFileSizeMB:true,
            branchesLimit: true
          }
        }
      },
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

  if (data.licenseName !== undefined)
    updateData.licenseName = data.licenseName;

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

  const getFile = (name) => files?.[name]?.[0]?.path;

  if (getFile("taxCertificateFile"))
    updateData.taxCertificateFile = getFile("taxCertificateFile");

  // if (getFile("unifiedNumberFile"))
  //   updateData.unifiedNumberFile = getFile("unifiedNumberFile");

  if (getFile("commercialActivityFile"))
    updateData.commercialActivityFile = getFile("commercialActivityFile");

  if (getFile("factoryLogo"))
    updateData.factoryLogo = getFile("factoryLogo");

  return prisma.subscriber.update({
    where: { id: Number(id) },
    data: updateData,
  }); 
};

// ===============================
// Change Status ( Delete)
// ===============================
exports.changeStatus = async (id, status) => {
  return prisma.subscriber.update({
    where: { id: Number(id) },
    data: { status },
  });
};


// ===============================
// Export Subscribers Excel
// ===============================
// ===============================
// Export Subscribers Excel (FULL DATA + FILTERS + MULTI ID)
// ===============================
exports.exportExcel = async (query = {}) => {
  const { status, countryId, cityId, id } = query;

  const where = {};

  if (status) where.status = { in: status.split(",") };
  if (countryId) where.countryId = Number(countryId);
  if (cityId) where.cityId = Number(cityId);

  const idFilter = buildIdFilter(id);
  if (idFilter) where.id = idFilter;

  const data = await prisma.subscriber.findMany({
    where,
    include: {
      country: { select: { name: true } },
      city: { select: { name: true } },
      plan: {
        select: {
          name: true,
          durationMonths: true,
          paidFees: true,
          usersLimit: true,
          fileLimit: true,
          maxFileSizeMB: true,
          branchesLimit: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return exportExcelUtil({
    filePrefix: "subscribers_full",
    headers: [
      "ID",
      "License Name",
      "License Number",
      "License Type",
      "Unified Number",
      "Owners Names",
      "Commercial Register Number",
      "Tax Number",
      "Email",
      "Mobile",
      "Country",
      "City",
      "Facility Link",
      "Language",
      "Currency",
      "Status",
      "Subscription Start",
      "Subscription End",
      "Plan Name",
      "Plan Duration",
      "Paid Fees",
      "Users Limit",
      "File Limit",
      "Max File Size",
      "Branches Limit",
      "Created At"
    ],

    rows: data.map(s => [
      s.id,
      s.licenseName,
      s.licenseNumber,
      s.licenseType,
      s.unifiedNumber,
      s.ownersNames,
      s.commercialRegisterNumber,
      s.taxNumber,
      s.subscriberEmail,
      s.primaryMobile,
      s.country?.name,
      s.city?.name,
      s.facilityLink,
      s.language,
      s.currency,
      s.status,
      s.subscriptionStartDate,
      s.subscriptionEndDate,
      s.plan?.name,
      s.plan?.durationMonths,
      s.plan?.paidFees,
      s.plan?.usersLimit,
      s.plan?.fileLimit,
      s.plan?.maxFileSizeMB,
      s.plan?.branchesLimit,
      s.createdAt
    ])
  });
};


// ===============================
// Export Subscribers PDF
// ===============================
// ===============================
// Export Subscribers PDF (FULL + FILTERS + MULTI ID)
// ===============================
exports.exportPDF = async (query = {}) => {
  const { status, id } = query;

  const where = {};

  if (status) where.status = { in: status.split(",") };

  const idFilter = buildIdFilter(id);
  if (idFilter) where.id = idFilter;

  const data = await prisma.subscriber.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });

  return exportPDFUtil({
    title: "Subscribers Full Report",
    filePrefix: "subscribers_full",

    headers: [
      { label: "Name", width: 130 },
      { label: "License No", width: 90 },
      { label: "Unified No", width: 90 },
      { label: "Mobile", width: 110 },
      { label: "Status", width: 70 },
      { label: "Start", width: 90 },
      { label: "End", width: 90 }
    ],

    rows: data.map(s => [
      s.licenseName,
      s.licenseNumber,
      s.unifiedNumber,
      s.primaryMobile,
      s.status,
      s.subscriptionStartDate,
      s.subscriptionEndDate
    ])
  });
};

