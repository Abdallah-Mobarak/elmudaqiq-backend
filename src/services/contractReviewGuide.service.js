const prisma = require("../config/prisma");
const hierarchicalSort = require("../utils/hierarchicalSort");

module.exports = {
  /**
   * Get all review guide items for a specific contract.
   * Ensures user has access to the contract.
   */
  getContractGuides: async (user, contractId) => {
    // 1. Verify user has access to the contract
    const contract = await prisma.engagementContract.findFirst({
      where: {
        id: contractId,
        subscriberId: Number(user.subscriberId),
      },
      select: { id: true }
    });

    if (!contract) {
      throw { status: 404, customMessage: "Contract not found or access denied." };
    }

    // 2. Fetch the guides for that contract, including related documents
    const guides = await prisma.contractReviewGuide.findMany({
      where: { contractId },
      include: {
        documents: {
          select: {
            id: true,
            fileName: true,
            filePath: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        },
      },
      orderBy: { id: 'asc' } // Or by 'number' if it's sortable
    });

    return hierarchicalSort(guides, "number");
  },

  /**
   * Get ONLY Pending review guide items (isApplicable == null).
   * Used for "Pending Requests" screen.
   */
  getPendingGuides: async (user, contractId) => {
    // 1. Verify Access
    const contract = await prisma.engagementContract.findFirst({
      where: {
        id: contractId,
        subscriberId: Number(user.subscriberId),
      },
      select: { id: true }
    });

    if (!contract) {
      throw { status: 404, customMessage: "Contract not found or access denied." };
    }

    // 2. Fetch only items where isApplicable is NULL
    const pendingGuides = await prisma.contractReviewGuide.findMany({
      where: {
        contractId,
        isApplicable: null // This defines "Pending"
      },
      orderBy: { id: 'asc' }
    });

    return hierarchicalSort(pendingGuides, "number");
  },

  /**
   * Update a specific review guide item (e.g., set isApplicable or conclusion).
   * Technical Auditor action.
   */
  updateGuideItem: async (user, guideId, data) => {
    const { isApplicable, conclusion } = data;

    // 1. Find the guide item to ensure it exists
    const guideItem = await prisma.contractReviewGuide.findUnique({
      where: { id: guideId },
      select: { contract: { select: { subscriberId: true } } }
    });

    if (!guideItem) {
      throw { status: 404, customMessage: "Review guide item not found." };
    }

    // 2. Security check: ensure the user belongs to the same subscriber as the contract
    if (guideItem.contract.subscriberId !== Number(user.subscriberId)) {
      throw { status: 403, customMessage: "Forbidden." };
    }

    // 3. Perform the update
    return await prisma.contractReviewGuide.update({
      where: { id: guideId },
      data: {
        isApplicable: typeof isApplicable === 'boolean' ? isApplicable : undefined,
        conclusion: conclusion || undefined,
        dateReviewed: new Date() // Mark as reviewed now
      },
    });
  },
 
  /**
   * Add a supporting document to a review guide item.
   */
  addDocument: async (user, guideId, file) => {
    if (!file) throw { status: 400, customMessage: "File is required." };

    const guideItem = await prisma.contractReviewGuide.findUnique({ where: { id: guideId } });
    if (!guideItem) throw { status: 404, customMessage: "Review guide item not found." };

    return await prisma.contractDocument.create({
      data: {
        contractId: guideItem.contractId,
        reviewGuideId: guideId,
        fileName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        uploadedById: user.id,
      },
    });
  },
};