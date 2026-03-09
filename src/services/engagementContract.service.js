const prisma = require("../config/prisma");
const { ROLES } = require("../config/roles");
const notificationService = require("./notification.service");
const activityLogService = require("./activityLog.service");

module.exports = {
 
  // ===============================
  // Create Contract (Secretary)
  // ===============================
  create: async (user, data, files) => {

    const subscriberId = Number(user.subscriberId);
    const branchId = user.branchId ? Number(user.branchId) : null;
    const contractYear = new Date(data.engagementContractDate).getFullYear();

    // Check duplicate contract (Same Commercial Register + Same Year)
    const existingContract = await prisma.engagementContract.findFirst({
      where: {
        subscriberId,
        commercialRegisterNumber: data.commercialRegisterNumber,
        engagementContractDate: {
          gte: new Date(`${contractYear}-01-01`),
          lte: new Date(`${contractYear}-12-31`)
        }
      }
    });

    if (existingContract) {
      throw { status: 400, customMessage: "A company contract for this fiscal year already exists." };
    }

    // Prepare file paths
    const filePaths = {
      articlesOfAssociation: files.articlesOfAssociation?.[0]?.path || null,
      vatCertificate: files.vatCertificate?.[0]?.path || null,
      unifiedNumberCertificate: files.unifiedNumberCertificate?.[0]?.path || null,
      commercialRegisterActivity: files.commercialRegisterActivity?.[0]?.path || null,
      facilityLogo: files.facilityLogo?.[0]?.path || null
    };

    // Transaction: Generate contract number and create contract
    return prisma.$transaction(async (tx) => {

      const lastContract = await tx.engagementContract.findFirst({
        where: { subscriberId },
        orderBy: { contractNumber: "desc" },
        select: { contractNumber: true }
      });

      let nextSerial = 1;

      if (lastContract?.contractNumber) {
        const currentNum = parseInt(lastContract.contractNumber);
        if (!isNaN(currentNum)) {
          nextSerial = currentNum + 1;
        }
      }

      const contractNumber = `00${nextSerial}`;

      const newContract = await tx.engagementContract.create({
        data: {
          ...data,
          ...filePaths,
          contractNumber,
          status: "INACTIVE",
          createdById: user.id,
          subscriberId,
          branchId,
          commercialRegisterDate: new Date(data.commercialRegisterDate),
          engagementContractDate: new Date(data.engagementContractDate)
        }
      });

      // --- Snapshot Review Guides ---
      // 1. Fetch all review guides for the subscriber
      const reviewGuides = await tx.reviewGuide.findMany({
        where: { subscriberId },
      });

      // 2. If guides exist, map and create them for the new contract
      if (reviewGuides.length > 0) {
        const contractReviewGuidesData = reviewGuides.map((guide) => ({
          contractId: newContract.id,
          level: guide.level,
          separator: guide.separator,
          number: guide.number,
          statement: guide.statement,
          purpose: guide.purpose,
        }));

        await tx.contractReviewGuide.createMany({
          data: contractReviewGuidesData,
        });
      }

      return newContract; // Return contract to be used outside transaction
    });

    // --- NOTIFICATION LOGIC (After Transaction) ---
    // Notify Audit Managers in the same branch
    try {
      const auditManagers = await prisma.user.findMany({
        where: {
          subscriberId,
          branchId: branchId || undefined, // If branchId is null, maybe notify all? Better stick to branch logic if exists
          Role: { name: ROLES.AUDIT_MANAGER }
        }
      });

      for (const manager of auditManagers) {
        await notificationService.create({
          title: "New Contract Created",
          message: `A new contract (${data.customerName}) has been created and is waiting for your review.`,
          type: "WORKFLOW",
          subscriberId,
          userId: manager.id
        });
      }
    } catch (error) {
      console.error("Failed to send notifications:", error);
    }

    return result; // 'result' is the newContract from transaction
  },


  // ===============================
  // Get All Contracts
  // ===============================
  getAll: async (user, query) => {

    const { page = 1, limit = 10, search, status } = query;
    const subscriberId = Number(user.subscriberId);

    const where = { subscriberId };

    // Audit Manager can only see contracts of his branch
    if (user.Role?.name === "Audit Manager" && user.branchId) {
      where.branchId = user.branchId;
    }

    // Technical Auditor Filter: INACTIVE + Approved by Manager (auditManagerId != null)
    if (user.Role?.name === ROLES.TECHNICAL_AUDITOR) {
      where.branchId = user.branchId; // Must be same branch
      where.status = "INACTIVE";
      where.auditManagerId = { not: null };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.AND = [
        { subscriberId },
        {
          OR: [
            { contractNumber: { contains: search } },
            { customerName: { contains: search } },
            { commercialRegisterNumber: { contains: search } }
          ]
        }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [contracts, total] = await Promise.all([
      prisma.engagementContract.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          auditManager: { select: { id: true, fullName: true } }
        }
      }),
      prisma.engagementContract.count({ where })
    ]);

    return {
      data: contracts,
      total,
      page: Number(page),
      limit: Number(limit)
    };

  },


  // ===============================
  // Get One Contract
  // ===============================
  getOne: async (user, id) => {

    const contract = await prisma.engagementContract.findFirst({
      where: {
        id,
        subscriberId: Number(user.subscriberId)
      },
      include: {
        createdBy: true,
        auditManager: true
      }
    });

    if (!contract) {
      throw { status: 404, customMessage: "Contract not found" };
    }

    return contract;

  },


  // ===============================
  // Update Contract (Secretary)
  // ===============================
  update: async (user, id, data, files) => {

    const subscriberId = Number(user.subscriberId);

    const contract = await prisma.engagementContract.findFirst({
      where: { id, subscriberId }
    });

    if (!contract) {
      throw { status: 404, customMessage: "Contract not found" };
    }

    // Secretary can update only when contract is returned from manager
    if (contract.status !== "ACTIVE") {
      throw {
        status: 403,
        customMessage: "Cannot edit contract in current status."
      };
    }

    // Check for duplicates if critical fields are changing (Same CR + Same Year rule)
    if (data.commercialRegisterNumber || data.engagementContractDate) {
      const targetCR = data.commercialRegisterNumber || contract.commercialRegisterNumber;
      const targetDate = data.engagementContractDate ? new Date(data.engagementContractDate) : contract.engagementContractDate;
      const targetYear = targetDate.getFullYear();

      const conflictingContract = await prisma.engagementContract.findFirst({
        where: {
          subscriberId,
          commercialRegisterNumber: targetCR,
          engagementContractDate: {
            gte: new Date(`${targetYear}-01-01`),
            lte: new Date(`${targetYear}-12-31`)
          },
          id: { not: id } // Exclude current contract from check
        }
      }); 

      if (conflictingContract) {
        throw { status: 400, customMessage: "A company contract for this fiscal year already exists." };
      }
    }

    const fileUpdates = {};

    if (files.articlesOfAssociation)
      fileUpdates.articlesOfAssociation = files.articlesOfAssociation[0].path;

    if (files.vatCertificate)
      fileUpdates.vatCertificate = files.vatCertificate[0].path;

    if (files.unifiedNumberCertificate)
      fileUpdates.unifiedNumberCertificate = files.unifiedNumberCertificate[0].path;

    if (files.commercialRegisterActivity)
      fileUpdates.commercialRegisterActivity = files.commercialRegisterActivity[0].path;

    if (files.facilityLogo)
      fileUpdates.facilityLogo = files.facilityLogo[0].path;

    const updatedContract = await prisma.engagementContract.update({
      where: { id },
      data: {
        ...data,
        ...fileUpdates,
        status: "INACTIVE",
        auditManagerId: null, // RESET: So it goes back to Manager's queue, not Technical Auditor
        ...(data.commercialRegisterDate && {
          commercialRegisterDate: new Date(data.commercialRegisterDate)
        }),
        ...(data.engagementContractDate && {
          engagementContractDate: new Date(data.engagementContractDate)
        })
      }
    });

    // --- NOTIFICATION LOGIC ---
    try {
      // 1. If Returned (ACTIVE) -> Notify the Creator (Secretary)
      if (data.status === "ACTIVE") {
        await notificationService.create({
          title: "Contract Returned for Edit",
          message: `Contract (${contract.contractNumber}) has been returned with comments: ${data.comments}`,
          type: "WORKFLOW",
          subscriberId,
          userId: contract.createdById
        });
      }

      // 2. If Approved (INACTIVE) -> Notify Technical Auditors in the branch
      if (data.status === "INACTIVE") {
        const techAuditors = await prisma.user.findMany({
          where: {
            subscriberId,
            branchId: contract.branchId,
            Role: { name: ROLES.TECHNICAL_AUDITOR }
          }
        });

        for (const auditor of techAuditors) {
          await notificationService.create({
            title: "Contract Ready for Technical Audit",
            message: `Contract (${contract.contractNumber}) has been approved and is ready for technical audit.`,
            type: "WORKFLOW",
            subscriberId,
            userId: auditor.id
          });
        }
      }
    } catch (error) {
      console.error("Failed to send review notifications:", error);
    }

    return updatedContract;

  },


  // ===============================
  // Review Contract (Audit Manager)
  // ===============================
  review: async (user, id, data) => {

    const subscriberId = Number(user.subscriberId);

    const contract = await prisma.engagementContract.findFirst({
      where: { id, subscriberId }
    });

    if (!contract) {
      throw { status: 404, customMessage: "Contract not found" };
    }

    // Manager Actions: ACTIVE (Return), INACTIVE (Approve for Tech Audit), ARCHIVE (Final)
    if (!["ACTIVE", "INACTIVE", "ARCHIVE"].includes(data.status)) {
      throw {
        status: 400,
        customMessage: "Invalid status. Must be ACTIVE (Return), INACTIVE (Approve), or ARCHIVE."
      };
    }

    // Validation: If manager is approving (moving to INACTIVE for Tech Auditor),
    // check if all applicable review guides have documents.
    if (data.status === "INACTIVE") {
      const incompleteGuidesCount = await prisma.contractReviewGuide.count({
        where: {
          contractId: id,
          isApplicable: true,
          documents: {
            none: {} // Find guides that have NO related documents
          }
        }
      });

      if (incompleteGuidesCount > 0) {
        throw { status: 400, customMessage: `Cannot approve. There are ${incompleteGuidesCount} applicable items missing supporting documents.` };
      }
    }

    const updatedContract = await prisma.engagementContract.update({
      where: { id },
      data: {
        status: data.status,
        managerComments: data.comments,
        auditManagerId: user.id
      }
    });

    return updatedContract;

  },

  // ===============================
  // Assign Staff (Audit Manager)
  // ===============================
  assignStaff: async (user, contractId, staffData) => {
    const contract = await prisma.engagementContract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw { status: 404, customMessage: "Contract not found" };
    }

    // Security: Check Subscriber
    if (contract.subscriberId !== Number(user.subscriberId)) {
      throw { status: 403, customMessage: "Unauthorized access to this contract" };
    }

    // Workflow: Cannot assign if status is ACTIVE (Returned to Secretary)
    if (contract.status === "ACTIVE") {
      throw {
        status: 403,
        customMessage: "Cannot assign staff while contract is returned to secretariat."
      };
    }

    // Validate Staff exists and belongs to same subscriber
    const staffUser = await prisma.user.findFirst({
      where: {
        id: staffData.userId,
        subscriberId: Number(user.subscriberId)
      }
    });

    if (!staffUser) {
      throw { status: 404, customMessage: "Staff user not found in your organization" };
    }

    // Validation: Ensure the role being assigned is one of the allowed roles
    const allowedRoles = [
      ROLES.ASSISTANT_TECHNICAL_AUDITOR,
      ROLES.FIELD_AUDITOR,
      ROLES.CONTACT_PERSON
    ];

    if (!allowedRoles.includes(staffData.role)) {
      throw {
        status: 400,
        customMessage: `Invalid role. Can only assign: ${allowedRoles.join(", ")}.`
      };
    }

    // Create assignment (Prisma will throw error if unique constraint contractId_userId is violated)
    const newAssignment = await prisma.contractStaff.create({
      data: {
        contractId,
        userId: staffData.userId,
        role: staffData.role
      }
    });

    // Log to Audit Trail
    await activityLogService.create({
      userId: user.id,
      subscriberId: Number(user.subscriberId),
      userType: "SUBSCRIBER",
      action: "ASSIGN_STAFF",
      message: `Assigned ${staffUser.fullName} as ${staffData.role} to Contract ${contract.contractNumber}`
    });

    // --- NOTIFICATION LOGIC ---
    // Notify the assigned staff member
    await notificationService.create({
      title: "New Assignment",
      message: `You have been assigned as ${staffData.role} to Contract ${contract.contractNumber}.`,
      type: "WORKFLOW",
      subscriberId: Number(user.subscriberId),
      userId: staffData.userId
    });

    return newAssignment;
  },

  // ===============================
  // Remove Staff (Technical Auditor)
  // ===============================
  removeStaff: async (user, contractId, staffId) => {
    // 1. Check Contract Access
    const contract = await prisma.engagementContract.findFirst({
      where: { id: contractId, subscriberId: Number(user.subscriberId) }
    });
    if (!contract) throw { status: 404, customMessage: "Contract not found" };

    // 2. Check Staff Assignment Existence
    const assignment = await prisma.contractStaff.findFirst({
      where: { 
        contractId, 
        userId: Number(staffId) 
      },
      include: { user: true } // Include user to get name for log
    });

    if (!assignment) throw { status: 404, customMessage: "Staff assignment not found" };

    // 3. Delete
    await prisma.contractStaff.delete({
      where: { id: assignment.id }
    });

    // Log to Audit Trail
    await activityLogService.create({
      userId: user.id,
      subscriberId: Number(user.subscriberId),
      userType: "SUBSCRIBER",
      action: "REMOVE_STAFF",
      message: `Removed staff member ${assignment.user.fullName} from Contract ${contract.contractNumber}`
    });

    return { message: "Staff removed successfully" };
  }

};