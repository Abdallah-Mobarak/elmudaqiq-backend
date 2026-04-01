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

      // Find the last contract within the same year to determine the next serial number
      const lastContractInYear = await tx.engagementContract.findFirst({
        where: {
          subscriberId,
          engagementContractDate: {
            gte: new Date(`${contractYear}-01-01`),
            lte: new Date(`${contractYear}-12-31`)
          }
        },
        orderBy: { createdAt: "desc" }, // Get the most recently created contract in that year
        select: { contractNumber: true }
      });

      let nextSerial = 1;
      if (lastContractInYear?.contractNumber) {
        const parts = lastContractInYear.contractNumber.split('/');
        const lastSerialPart = parts[parts.length - 1]; // Get the serial part
        const lastSerial = parseInt(lastSerialPart);
        if (!isNaN(lastSerial)) {
          nextSerial = lastSerial + 1;
        }
      }

      const formattedSerial = String(nextSerial).padStart(4, '0'); // e.g., 0001, 0012
      const contractNumber = `${data.commercialRegisterNumber}/${contractYear}/${formattedSerial}`;

      const newContract = await tx.engagementContract.create({
        data: {
          ...data,
          ...filePaths,
          workflowStage: "PENDING_AUDIT_MANAGER", // Set initial workflow stage
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
          responsiblePerson: guide.responsiblePerson,
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
    const { page = 1, limit = 10, search, status, workflowStage } = query;
    const subscriberId = Number(user.subscriberId);
    const userRole = user.role;

    const where = { subscriberId };

    // --- Scope to Branch (if user is not a subscriber owner) ---
    if (user.branchId && ![ROLES.SUBSCRIBER_OWNER, ROLES.ADMIN].includes(userRole)) {
      where.branchId = user.branchId;
    }

    // --- Workflow Stage Filtering based on Role ---
    const viewPermissions = {
      [ROLES.AUDIT_MANAGER]: ['PENDING_AUDIT_MANAGER', 'PENDING_TECHNICAL_AUDIT', 'PENDING_FIELD_AUDIT', 'PENDING_QC_REVIEW', 'PENDING_PARTNER_REVIEW', 'PENDING_REGULATORY_FILING', 'PENDING_ARCHIVING', 'COMPLETED'],
      [ROLES.TECHNICAL_AUDITOR]: ['PENDING_TECHNICAL_AUDIT', 'PENDING_FIELD_AUDIT', 'PENDING_QC_REVIEW', 'PENDING_PARTNER_REVIEW', 'PENDING_REGULATORY_FILING', 'PENDING_ARCHIVING', 'COMPLETED'],
      [ROLES.FIELD_AUDITOR]: ['PENDING_FIELD_AUDIT', 'PENDING_QC_REVIEW', 'PENDING_PARTNER_REVIEW', 'PENDING_REGULATORY_FILING', 'PENDING_ARCHIVING', 'COMPLETED'],
      [ROLES.ASSISTANT_TECHNICAL_AUDITOR]: ['PENDING_FIELD_AUDIT', 'PENDING_QC_REVIEW', 'PENDING_PARTNER_REVIEW', 'PENDING_REGULATORY_FILING', 'PENDING_ARCHIVING', 'COMPLETED'],
      [ROLES.QUALITY_CONTROL]: ['PENDING_QC_REVIEW', 'PENDING_PARTNER_REVIEW', 'PENDING_REGULATORY_FILING', 'PENDING_ARCHIVING', 'COMPLETED'],
      [ROLES.MANAGING_PARTNER]: ['PENDING_PARTNER_REVIEW', 'PENDING_REGULATORY_FILING', 'PENDING_ARCHIVING', 'COMPLETED'],
      [ROLES.REGULATORY_FILINGS_OFFICER]: ['PENDING_REGULATORY_FILING', 'PENDING_ARCHIVING', 'COMPLETED'],
      [ROLES.ARCHIVE_OFFICER]: ['PENDING_ARCHIVING', 'COMPLETED'],
    };

    if (viewPermissions[userRole]) {
      where.workflowStage = { in: viewPermissions[userRole] };
    }

    // Allow frontend to filter by a specific workflow stage if provided
    if (workflowStage) {
      if (where.workflowStage && where.workflowStage.in) {
        if (where.workflowStage.in.includes(workflowStage)) {
          where.workflowStage = workflowStage; // Refine the search
        } else {
          where.id = '-1'; // Impossible condition
        }
      } else {
        where.workflowStage = workflowStage;
      }
    }

    // The old `status` field is still used for the Secretary <-> Audit Manager loop.
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { contractNumber: { contains: search } },
        { customerName: { contains: search } },
        { commercialRegisterNumber: { contains: search } }
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

    const updateData = {
      status: data.status,
      managerComments: data.comments,
      auditManagerId: user.id
    };

    // If manager approves (by setting status back to INACTIVE), advance the workflow stage
    if (data.status === "INACTIVE" && contract.status === "INACTIVE") {
      updateData.workflowStage = 'PENDING_TECHNICAL_AUDIT';
    }

    const updatedContract = await prisma.engagementContract.update({
      where: { id },
      data: updateData
    });

    return updatedContract;

  },

  // ===============================
  // Get Eligible Staff for Assignment
  // ===============================
  getEligibleStaff: async (user, contractId) => {
    const contract = await prisma.engagementContract.findUnique({
      where: { id: contractId },
      select: { id: true, branchId: true, subscriberId: true }
    });

    if (!contract) throw { status: 404, customMessage: "Contract not found" };

    // Security Check
    if (contract.subscriberId !== Number(user.subscriberId)) {
      throw { status: 403, customMessage: "Unauthorized" };
    }

    // Fetch users who are in the SAME branch AND have one of the allowed roles
    const eligibleUsers = await prisma.user.findMany({
      where: {
        subscriberId: contract.subscriberId,
        branchId: contract.branchId, // Rule 1: Same Branch
        Role: {
          name: {
            in: [ROLES.ASSISTANT_TECHNICAL_AUDITOR, ROLES.FIELD_AUDITOR, ROLES.CONTACT_PERSON] // Rule 3: Specific Roles
          }
        },
        status: "active"
      },
      select: { id: true, fullName: true, email: true, jobTitle: true, Role: { select: { name: true } } }
    });

    return eligibleUsers;
  },
 
  // ===============================
  // Assign Staff (Audit Manager)
  // ===============================
  assignStaff: async (user, contractId, payload) => {
    const contract = await prisma.engagementContract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw { status: 404, customMessage: "Contract not found" };
    }

    // Security: Check if user has permission (Audit Manager or Technical Auditor)
    if (![ROLES.AUDIT_MANAGER, ROLES.TECHNICAL_AUDITOR].includes(user.role)) {
      throw { status: 403, customMessage: "You do not have permission to assign staff." };
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

    // Support Bulk Assignment (Array) or Single Object
    const assignments = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const item of assignments) {
      // Validate Staff exists and belongs to same subscriber
      const staffUser = await prisma.user.findFirst({
        where: {
          id: item.userId,
          subscriberId: Number(user.subscriberId)
        }
      });

      if (!staffUser) {
        throw { status: 404, customMessage: `Staff user (ID: ${item.userId}) not found.` };
      }

      // Rule 1 Validation: Check if staff is in the same branch
      if (staffUser.branchId !== contract.branchId) {
        throw { status: 400, customMessage: `Staff member ${staffUser.fullName} must belong to the same branch.` };
      }

      // Validation: Ensure the role being assigned is one of the allowed roles
      const allowedRoles = [
        ROLES.ASSISTANT_TECHNICAL_AUDITOR,
        ROLES.FIELD_AUDITOR,
        ROLES.CONTACT_PERSON
      ];

      if (!allowedRoles.includes(item.role)) {
        throw {
          status: 400,
          customMessage: `Invalid role for ${staffUser.fullName}. Allowed: ${allowedRoles.join(", ")}.`
        };
      }

      // Check if already assigned this specific role (to avoid duplicate error)
      const exists = await prisma.contractStaff.findFirst({
        where: { contractId, userId: item.userId, role: item.role }
      });
      
      if (exists) {
         throw { status: 400, customMessage: `${staffUser.fullName} is already assigned as ${item.role}.` };
      }

      // Create assignment
      const newAssignment = await prisma.contractStaff.create({
        data: {
          contractId,
          userId: item.userId,
          role: item.role
        }
      });

      // Log to Audit Trail
      await activityLogService.create({
        userId: user.id,
        subscriberId: Number(user.subscriberId),
        userType: "SUBSCRIBER",
        action: "ASSIGN_STAFF",
        message: `Assigned ${staffUser.fullName} as ${item.role} to Contract ${contract.contractNumber}`
      });

      // --- NOTIFICATION LOGIC ---
      await notificationService.create({
        title: "New Assignment",
        message: `You have been assigned as ${item.role} to Contract ${contract.contractNumber}.`,
        type: "WORKFLOW",
        subscriberId: Number(user.subscriberId),
        userId: item.userId
      });

      results.push(newAssignment);
    }

    return results;
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

    // Security: Check if user has permission (Audit Manager or Technical Auditor)
    if (![ROLES.AUDIT_MANAGER, ROLES.TECHNICAL_AUDITOR].includes(user.role)) {
      throw { status: 403, customMessage: "You do not have permission to remove staff." };
    }

    // 2. Check Staff Assignment Existence
    const assignments = await prisma.contractStaff.findMany({
      where: { 
        contractId, 
        userId: Number(staffId) 
      },
      include: { user: true } // Include user to get name for log
    });

    if (assignments.length === 0) throw { status: 404, customMessage: "Staff assignment not found" };

    // 3. Delete
    await prisma.contractStaff.deleteMany({
      where: { 
        contractId,
        userId: Number(staffId)
      }
    });

    // Log to Audit Trail
    const staffName = assignments[0].user.fullName;
    const rolesRemoved = assignments.map(a => a.role).join(", ");

    await activityLogService.create({
      userId: user.id,
      subscriberId: Number(user.subscriberId),
      userType: "SUBSCRIBER",
      action: "REMOVE_STAFF",
      message: `Removed staff member ${staffName} (Roles: ${rolesRemoved}) from Contract ${contract.contractNumber}`
    });

    return { message: "Staff removed successfully" };
  },

  // ===============================
  // Submit Stage & Advance Workflow
  // ===============================
  submitStage: async (user, contractId) => {
    const contract = await prisma.engagementContract.findUnique({
      where: { id: contractId, subscriberId: user.subscriberId }
    });
    if (!contract) throw { status: 404, customMessage: "Contract not found" };

    const currentStage = contract.workflowStage;
    const userRole = user.role;
    let nextStage = null;

    const transitions = {
      [ROLES.TECHNICAL_AUDITOR]: { from: 'PENDING_TECHNICAL_AUDIT', to: 'PENDING_FIELD_AUDIT' },
      [ROLES.FIELD_AUDITOR]: { from: 'PENDING_FIELD_AUDIT', to: 'PENDING_QC_REVIEW' },
      [ROLES.ASSISTANT_TECHNICAL_AUDITOR]: { from: 'PENDING_FIELD_AUDIT', to: 'PENDING_QC_REVIEW' },
      [ROLES.QUALITY_CONTROL]: { from: 'PENDING_QC_REVIEW', to: 'PENDING_PARTNER_REVIEW' },
      [ROLES.MANAGING_PARTNER]: { from: 'PENDING_PARTNER_REVIEW', to: 'PENDING_REGULATORY_FILING' },
      [ROLES.REGULATORY_FILINGS_OFFICER]: { from: 'PENDING_REGULATORY_FILING', to: 'PENDING_ARCHIVING' },
      [ROLES.ARCHIVE_OFFICER]: { from: 'PENDING_ARCHIVING', to: 'COMPLETED' },
    };

    const transition = transitions[userRole];

    if (!transition || currentStage !== transition.from) {
      throw { status: 403, customMessage: `Your role (${userRole}) cannot submit the contract from its current stage (${currentStage}).` };
    }

    nextStage = transition.to;

    // Specific checks before advancing
    if (userRole === ROLES.TECHNICAL_AUDITOR) {
      // 1. Ensure Trial Balance is confirmed
      const trialBalance = await prisma.trialBalance.findUnique({ where: { contractId } });
      if (!trialBalance || trialBalance.status !== 'CONFIRMED') {
        throw { status: 400, customMessage: "Cannot submit. The trial balance must be uploaded and confirmed first." };
      }

      // 2. Conditional Workflow: Check if field staff are assigned
      const assignedFieldStaffCount = await prisma.contractStaff.count({
        where: {
          contractId,
          role: { in: [ROLES.FIELD_AUDITOR, ROLES.ASSISTANT_TECHNICAL_AUDITOR] }
        }
      });

      if (assignedFieldStaffCount > 0) {
        nextStage = 'PENDING_FIELD_AUDIT'; // Go to Field Audit
      } else {
        nextStage = 'PENDING_QC_REVIEW'; // Skip Field Audit and go directly to QC
      }

    } else {
      // For all other roles, use the predefined linear transition
      const transition = transitions[userRole];
      if (!transition || currentStage !== transition.from) {
        throw { status: 403, customMessage: `Your role (${userRole}) cannot submit the contract from its current stage (${currentStage}).` };
      }
      nextStage = transition.to;
    }

    const updatedContract = await prisma.engagementContract.update({
      where: { id: contractId },
      data: { workflowStage: nextStage }
    });

    // TODO: Add notification logic for the next role in the chain
    // For example, find users with the role corresponding to `nextStage` and notify them.

    await activityLogService.create({
      userId: user.id,
      subscriberId: Number(user.subscriberId),
      userType: "SUBSCRIBER",
      action: "SUBMIT_STAGE",
      message: `User ${user.fullName} submitted contract ${contract.contractNumber} from ${currentStage} to ${nextStage}`
    });

    return updatedContract;
  } 

}; 