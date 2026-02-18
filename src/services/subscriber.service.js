const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

const saveUploadedFile = require("../utils/saveUploadedFile");
const exportExcelUtil = require("../utils/fileHandlers/exportExcel");
const exportPDFUtil = require("../utils/fileHandlers/exportPdf");
const generatePassword = require("../utils/passwordGenerator");
const { sendSubscriberWelcomeEmail } = require("./email.service");

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
    // التعديل: تخزين الاسم المختصر فقط (Slug) بدلاً من الرابط الكامل
    const subdomain = `${clean}${suffix}`;

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
      throw { status: 400, customMessage: `${field} is required` };
    }
  }

 // Check required files
 if (!getFile(files, "licenseCertificate")) {
    throw { status: 400, customMessage: "licenseCertificate file is required" };
}

  const existing = await prisma.subscriber.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });

  if (existing) {
    throw { status: 400, customMessage: "License already exists" };
  }

  // ===============================
  //  GET PLAN & CALCULATE END DATE
  // ===============================
  const plan = await prisma.plan.findUnique({
    where: { id: Number(data.planId) }
  });

  if (!plan) {
    throw { status: 400, customMessage: "Invalid Plan ID" };
  }

  // ===============================
  //  VALIDATE COUNTRY & CITY
  // ===============================
  const country = await prisma.country.findUnique({
    where: { id: Number(data.countryId) }
  });
  if (!country) {
    throw { status: 400, customMessage: "Invalid Country ID" };
  }

  const city = await prisma.city.findUnique({
    where: { id: Number(data.cityId) }
  });
  if (!city) {
    throw { status: 400, customMessage: "Invalid City ID" };
  }

  let subscriptionEndDate = null;

  if (data.subscriptionStartDate) {
    subscriptionEndDate = new Date(data.subscriptionStartDate);
    subscriptionEndDate.setMonth(
      subscriptionEndDate.getMonth() + Number(plan.durationMonths)
    );
  }

  const subdomain = await generateUniqueSubdomain(data.licenseName);

  // START TRANSACTION
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Subscriber
    const newSubscriber = await tx.subscriber.create({
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

      facilityLink: data.facilityLink || null,
      factoryLogo: getFile(files, "factoryLogo"),
      language: data.language || null,
      currency: data.currency || null,

      internalNotes: data.internalNotes || null,
      subdomain,
    },
  });

    // 2. Create Subscription
    await tx.subscription.create({
      data: {
        subscriberId: newSubscriber.id,
        planId: Number(data.planId),
        startDate: data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : new Date(),
        endDate: subscriptionEndDate || new Date(),
        amountPaid: plan.paidFees,
        paymentMethod: "CASH", // Default for initial creation or pass from data
        status: "ACTIVE",
        autoRenew: false
      }
    });

    // 3. Find Owner Role
    // Make sure you have seeded this role in your DB
    const ownerRole = await tx.role.findFirst({
      where: { name: "SUBSCRIBER_OWNER" } // Or whatever name you use for subscriber admins
    });

    if (!ownerRole) {
      throw { status: 500, customMessage: "System Error: SUBSCRIBER_OWNER role not found in database." };
    }

    // 4. Create Owner User
    const tempPassword = generatePassword(10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await tx.user.create({
      data: {
        fullName: `${data.licenseName} Owner`,
        email: data.subscriberEmail,
        password: hashedPassword,
        phone: data.primaryMobile,
        status: "active",
        roleId: ownerRole.id,
        subscriberId: newSubscriber.id,
        mustChangePassword: true
      }
    }); 

    // ===============================
    // 5. CLONE MASTER DATA (The "Snapshot" Logic)
    // ===============================
    
    // A. Clone Account Guide
    const accountTemplates = await tx.accountGuideTemplate.findMany();
    if (accountTemplates.length > 0) {
      await tx.accountGuide.createMany({
        data: accountTemplates.map(t => ({
          subscriberId: newSubscriber.id,
          level: t.level,
          accountNumber: t.accountNumber,
          accountName: t.accountName,
          rulesAndRegulations: t.rulesAndRegulations,
          disclosureNotes: t.disclosureNotes,
          code1: t.code1, code2: t.code2, code3: t.code3, code4: t.code4,
          code5: t.code5, code6: t.code6, code7: t.code7, code8: t.code8,
          objectiveCode: t.objectiveCode,
          relatedObjectives: t.relatedObjectives
        }))
      });
    }

    // B. Clone Review Guide
    const reviewTemplates = await tx.reviewGuideTemplate.findMany();
    if (reviewTemplates.length > 0) {
      await tx.reviewGuide.createMany({
        data: reviewTemplates.map(t => ({
          subscriberId: newSubscriber.id,
          level: t.level,
          separator: t.separator,
          number: t.number,
          statement: t.statement,
          purpose: t.purpose,
          responsiblePerson: t.responsiblePerson,
          datePrepared: t.datePrepared,
          dateReviewed: t.dateReviewed,
          conclusion: t.conclusion,
          attachments: t.attachments,
          notes1: t.notes1, notes2: t.notes2, notes3: t.notes3
        }))
      });
    }

    // C. Clone File Stages
    const fileStageTemplates = await tx.fileStageTemplate.findMany();
    if (fileStageTemplates.length > 0) {
      await tx.fileStage.createMany({
        data: fileStageTemplates.map(t => ({
          subscriberId: newSubscriber.id,
          stageCode: t.stageCode,
          stage: t.stage,
          entityType: t.entityType,
          economicSector: t.economicSector,
          procedure: t.procedure,
          scopeOfProcedure: t.scopeOfProcedure,
          selectionMethod: t.selectionMethod,
          examplesOfUse: t.examplesOfUse,
          IAS: t.IAS, IFRS: t.IFRS, ISA: t.ISA,
          relevantPolicies: t.relevantPolicies,
          detailedExplanation: t.detailedExplanation,
          formsToBeCompleted: t.formsToBeCompleted,
          practicalProcedures: t.practicalProcedures,
          associatedRisks: t.associatedRisks,
          riskLevel: t.riskLevel,
          responsibleAuthority: t.responsibleAuthority,
          outputs: t.outputs,
          implementationPeriod: t.implementationPeriod,
          strengths: t.strengths,
          potentialWeaknesses: t.potentialWeaknesses,
          performanceIndicators: t.performanceIndicators
        }))
      });
    }

    // D. Clone Review Objective Stages
    const objectiveTemplates = await tx.reviewObjectiveStageTemplate.findMany();
    if (objectiveTemplates.length > 0) {
      await tx.reviewObjectiveStage.createMany({
        data: objectiveTemplates.map(t => ({
          subscriberId: newSubscriber.id,
          codesCollected: t.codesCollected,
          numberOfCollectedObjectives: t.numberOfCollectedObjectives,
          ethicalCompliancePercentage: t.ethicalCompliancePercentage,
          professionalPlanningPercentage: t.professionalPlanningPercentage,
          internalControlPercentage: t.internalControlPercentage,
          evidencePercentage: t.evidencePercentage,
          evaluationPercentage: t.evaluationPercentage,
          documentationPercentage: t.documentationPercentage,
          totalRelativeWeight: t.totalRelativeWeight,
          codeOfEthics: t.codeOfEthics,
          policies: t.policies,
          ifrs: t.ifrs,
          ias: t.ias,
          notes: t.notes
        }))
      });
    }

    // E. Clone Review Mark Index
    const markTemplates = await tx.reviewMarkIndexTemplate.findMany();
    if (markTemplates.length > 0) {
      await tx.reviewMarkIndex.createMany({
        data: markTemplates.map(t => ({
          subscriberId: newSubscriber.id,
          codeImage: t.codeImage,
          name: t.name,
          shortDescription: t.shortDescription,
          suggestedStage: t.suggestedStage,
          whenToUse: t.whenToUse,
          exampleShortForm: t.exampleShortForm,
          sectorTags: t.sectorTags,
          assertion: t.assertion,
          benchmark: t.benchmark,
          scoreWeight: t.scoreWeight,
          severityLevel: t.severityLevel,
          severityWeight: t.severityWeight,
          priorityScore: t.priorityScore,
          priorityRating: t.priorityRating
        }))
      });
    }

    return { subscriber: newSubscriber, tempPassword };
  });

  // 4. Send Email (Outside transaction to avoid blocking DB if email is slow)
  // We wrap this in try/catch so file upload and response don't fail if email fails
  let emailStatus = "SENT";
  try {
    // التعديل: تكوين الرابط الكامل هنا لإرساله في الإيميل
    // يفضل وضع الدومين الأساسي في متغير بيئة (process.env.BASE_DOMAIN)
    const loginUrl = `http://${result.subscriber.subdomain}.mudqiq.com`; 
    
    await sendSubscriberWelcomeEmail({
      to: data.subscriberEmail,
      loginUrl,
      email: data.subscriberEmail,
      tempPassword: result.tempPassword
    });
  } catch (error) {
    console.error("Warning: Failed to send welcome email.", error.message);
    emailStatus = `FAILED: ${error.message}`;
  }

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

  // Return subscriber data + tempPassword (in case email failed) + email status
  return {
    ...result.subscriber,
    tempPassword: result.tempPassword,
    emailStatus
  };
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
    search,
  } = query;

  const where = {};

  if (status) where.status = { in: status.split(",") };
  if (countryId) where.countryId = Number(countryId);
  if (cityId) where.cityId = Number(cityId);

  if (search) {
    where.OR = [
      { licenseName: { contains: search,} },
      { licenseNumber: { contains: search } },
      { subscriberEmail: { contains: search } },
      { primaryMobile: { contains: search } },
      { unifiedNumber: { contains: search } },
    ];
  }

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
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true },
          take: 1
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
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        take: 1
      }
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

    rows: data.map(s => {
      const activeSub = s.subscriptions[0];
      const plan = activeSub?.plan;
      return [
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
      activeSub?.startDate,
      activeSub?.endDate,
      plan?.name,
      plan?.durationMonths,
      activeSub?.amountPaid,
      plan?.usersLimit,
      plan?.fileLimit,
      plan?.maxFileSizeMB,
      plan?.branchesLimit,
      s.createdAt
    ]})
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

// ===============================
// Get Subscriber Profile
// ===============================
exports.getSubscriberProfile = async (subscriberId) => {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: Number(subscriberId) },
    include: {
      country: true,
      city: true,
    },
  });

  if (!subscriber) {
    throw { status: 404, customMessage: "Subscriber not found" };
  }

  // Fetch Active Subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      subscriberId: Number(subscriberId),
      status: "ACTIVE"
    },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate usage statistics
  const usersCount = await prisma.user.count({
    where: { subscriberId: Number(subscriberId) },
  });

  // Placeholder for future entities (Branches, Clients, Storage)
  const branchesCount = 0;
  const clientsCount = 0;
  const storageUsedMB = 0;

  // External Links logic
  const authorityLinks = {
    cpa: subscriber.cpaWebsite || subscriber.country?.cpaWebsite || "",
    ministry: subscriber.commerceWebsite || subscriber.country?.commerceWebsite || "",
    tax: subscriber.taxWebsite || subscriber.country?.taxWebsite || "",
  };

  const plan = activeSubscription?.plan;

  // Calculate remaining days
  let remainingDays = 0;
  if (activeSubscription?.endDate) {
    const now = new Date();
    const end = new Date(activeSubscription.endDate);
    const diffTime = end - now;
    remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (remainingDays < 0) remainingDays = 0;
  }

  const usage = {
    users: {
      used: usersCount,
      limit: plan?.usersLimit || 0,
      remaining: (plan?.usersLimit || 0) - usersCount,
      percentage: plan?.usersLimit ? Math.round((usersCount / plan.usersLimit) * 100) : 0
    },
    branches: {
      used: branchesCount,
      limit: plan?.branchesLimit || 0,
      remaining: (plan?.branchesLimit || 0) - branchesCount,
      percentage: 0
    },
    clients: {
      used: clientsCount,
      limit: plan?.fileLimit || 0,
      remaining: (plan?.fileLimit || 0) - clientsCount,
      percentage: 0
    },
    storage: {
      usedMB: storageUsedMB,
      limitMB: plan?.maxFileSizeMB || 0,
      remainingMB: (plan?.maxFileSizeMB || 0) - storageUsedMB,
      percentage: 0
    },
    subscription: {
      startDate: activeSubscription?.startDate,
      endDate: activeSubscription?.endDate,
      remainingDays: remainingDays
    }
  };

  return {
    location: {
      country: subscriber.country?.name || "N/A",
      city: subscriber.city?.name || "N/A",
      authorityLinks
    },
    license: {
      type: subscriber.licenseType,
      number: subscriber.licenseNumber,
      date: subscriber.licenseDate,
      name: subscriber.licenseName
    },
    plan: {
      name: plan?.name || "No Active Plan",
      description: plan?.description || "",
      subscriptionStart: activeSubscription?.startDate,
      subscriptionEnd: activeSubscription?.endDate,
      paidFees: activeSubscription?.amountPaid,
      status: subscriber.status,
      usage
    }
  };
};

// ===============================
// Upgrade Subscription (Mock Flow)
// ===============================
exports.upgradeSubscription = async (subscriberId, planId) => {
  const plan = await prisma.plan.findUnique({
    where: { id: Number(planId) },
  });

  if (!plan) {
    throw { status: 404, customMessage: "Plan not found" };
  }

  // Calculate new end date based on plan duration
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + plan.durationMonths);

  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // 1. Expire current active subscription
    await tx.subscription.updateMany({
      where: {
        subscriberId: Number(subscriberId),
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
      },
    });

    // 2. Create new subscription
    const newSubscription = await tx.subscription.create({
      data: {
        subscriberId: Number(subscriberId),
        planId: plan.id,
        startDate: startDate,
        endDate: endDate,
        amountPaid: plan.paidFees,
        paymentMethod: "MOCK_UPGRADE", // Placeholder until payment gateway integration
        status: "ACTIVE",
      },
      include: { plan: true },
    });

    return newSubscription;
  });
};
