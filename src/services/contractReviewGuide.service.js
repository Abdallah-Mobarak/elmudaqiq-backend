const prisma = require("../config/prisma");
const hierarchicalSort = require("../utils/hierarchicalSort");

module.exports = {
  /**
   * Get all review guide items for a specific contract.
   * Ensures user has access to the contract.
   */
  getContractGuides: async (user, contractId) => {
    // 1. Verify user has access to this contract
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
  
    // 2. Regular users only see guides assigned to their role
    const where = { contractId };
    if (user.role && !["SUBSCRIBER_OWNER", "ADMIN"].includes(user.role)) {
      where.responsiblePerson = user.role;
    }
  
  
  
    // 3. Fetch guides with their documents
    const guides = await prisma.contractReviewGuide.findMany({
      where,
      include: {
        documents: {
          select: {
            id: true,
            fileName: true,
            filePath: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { id: "asc" },
    });
  
    console.log("guides count:", guides.length);
    console.log("guides:", JSON.stringify(guides));
    // 🔍 END LOG
  
    // 4. Flatten nested tree back to ordered flat list
    function flattenTree(nodes) {
      const result = [];
      for (const node of nodes) {
        const { children, ...item } = node;
        result.push(item);
        if (children?.length > 0) {
          result.push(...flattenTree(children));
        }
      }
      return result;
    }
  
    // 5. Admins and owners get full hierarchical sort
    if (!user.role || ["SUBSCRIBER_OWNER", "ADMIN"].includes(user.role)) {
      return hierarchicalSort(guides, "number");
    }
  
    // 6. Regular users: build tree then flatten to preserve order
    const flatSorted = guides.sort((a, b) =>
      String(a.number || "").localeCompare(String(b.number || ""), undefined, { numeric: true })
    );
  
    const map = {};
    flatSorted.forEach(item => {
      map[item.number] = { ...item, children: [] };
    });
  
    const tree = [];
    flatSorted.forEach(item => {
      const node = map[item.number];
      const parts = String(item.number || "").split(".");
      parts.pop();
  
      let parentFound = false;
      while (parts.length > 0) {
        const parentNum = parts.join(".");
        if (map[parentNum]) {
          map[parentNum].children.push(node);
          parentFound = true;
          break;
        }
        parts.pop();
      }
  
      if (!parentFound) tree.push(node);
    });
  
    return flattenTree(tree);
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

    // 2. Build where clause: only items where isApplicable is NULL, filtered by role
    const where = {
      contractId,
      isApplicable: null // This defines "Pending"
    };

    if (user.role && !["SUBSCRIBER_OWNER", "ADMIN"].includes(user.role)) {
      where.responsiblePerson = user.role;
    }

    const pendingGuides = await prisma.contractReviewGuide.findMany({
      where,
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