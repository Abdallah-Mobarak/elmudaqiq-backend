const prisma = require("../config/prisma");

/**
 * جلب أسماء الـ Account Guide الخاصة بالسبسكريب الحالي
 */
exports.getAccountGuideNames = async (req, res, next) => {
  try {
    const subscriberId = req.user.subscriberId;

    const accounts = await prisma.accountGuide.findMany({
      where: { subscriberId: Number(subscriberId) },
      select: {
        id: true,
        accountNumber: true,
        accountName: true,
        level: true,
      },
      orderBy: { accountNumber: "asc" },
    });

    res.status(200).json({ data: accounts });
  } catch (error) {
    console.error("Get Account Guide Names Error:", error);
    next(error);
  }
};

/**
 * حفظ ترتيب العناصر المختارة من صفحة Trial Balance قبل الانتقال لـ Worksheets
 * Body: { accountIds: ["uuid-1", "uuid-2", ...], sortOrder: "asc" | "desc" }
 */
exports.saveSort = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const { accountIds, sortOrder } = req.body;

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res
        .status(400)
        .json({ message: "يرجى إرسال مصفوفة الحسابات المختارة (accountIds)." });
    }

    if (!sortOrder || (sortOrder !== "asc" && sortOrder !== "desc")) {
      return res
        .status(400)
        .json({ message: "يرجى تحديد الترتيب (sortOrder): asc أو desc." });
    }

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
    });

    if (!trialBalance) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على ميزان مراجعة لهذا العقد." });
    }

    // جلب الحسابات المختارة
    const accounts = await prisma.trialBalanceAccount.findMany({
      where: {
        id: { in: accountIds },
        trialBalanceId: trialBalance.id,
      },
    });

    if (accounts.length !== accountIds.length) {
      return res
        .status(400)
        .json({ message: "بعض الحسابات المرسلة غير موجودة في ميزان المراجعة." });
    }

    // ترتيب حسب finalBalance
    const sorted = [...accounts].sort((a, b) => {
      return sortOrder === "asc"
        ? a.finalBalance - b.finalBalance
        : b.finalBalance - a.finalBalance;
    });

    // حفظ الترتيب - العناصر المرتبة تبدأ من 1
    const updates = sorted.map((acc, index) =>
      prisma.trialBalanceAccount.update({
        where: { id: acc.id },
        data: { worksheetOrder: index + 1 },
      })
    );

    // باقي العناصر اللي مش مختارة نشيل الترتيب بتاعها
    const resetOthers = prisma.trialBalanceAccount.updateMany({
      where: {
        trialBalanceId: trialBalance.id,
        id: { notIn: accountIds },
        assignedAccountGuideId: null,
      },
      data: { worksheetOrder: null },
    });

    await prisma.$transaction([...updates, resetOthers]);

    res.status(200).json({
      message: `تم حفظ ترتيب ${sorted.length} حساب بنجاح.`,
      sortedCount: sorted.length,
    });
  } catch (error) {
    console.error("Save Sort Error:", error);
    next(error);
  }
};

/**
 * جلب حسابات أوراق العمل - تبويبة Unassigned
 * العناصر المرتبة (worksheetOrder) تظهر أولاً في الأعلى، ثم الباقي
 */
exports.getUnassigned = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const { page = 1, limit = 25, search } = req.query;

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
    });

    if (!trialBalance) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على ميزان مراجعة لهذا العقد." });
    }

    const where = {
      trialBalanceId: trialBalance.id,
      assignedAccountGuideId: null,
    };

    if (search) {
      where.OR = [
        { accountCode: { contains: search } },
        { accountName: { contains: search } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [accounts, total] = await prisma.$transaction([
      prisma.trialBalanceAccount.findMany({
        where,
        skip,
        take: Number(limit),
        // العناصر المرتبة أولاً (worksheetOrder not null)، ثم الباقي حسب accountCode
        orderBy: [
          { worksheetOrder: { sort: "asc", nulls: "last" } },
          { accountCode: "asc" },
        ],
      }),
      prisma.trialBalanceAccount.count({ where }),
    ]);

    res.status(200).json({
      data: accounts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      status: trialBalance.status,
    });
  } catch (error) {
    console.error("Get Unassigned Worksheet Error:", error);
    next(error);
  }
};

/**
 * جلب حسابات أوراق العمل - تبويبة Assigned
 * حسابات ميزان المراجعة التي تم ربطها بنجاح
 */
exports.getAssigned = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const { page = 1, limit = 25, search, sortOrder } = req.query;

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
    });

    if (!trialBalance) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على ميزان مراجعة لهذا العقد." });
    }

    const where = {
      trialBalanceId: trialBalance.id,
      assignedAccountGuideId: { not: null },
    };

    if (search) {
      where.OR = [
        { accountCode: { contains: search } },
        { accountName: { contains: search } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // الترتيب الافتراضي: حسب worksheetOrder (الترتيب اللي اتحفظ وقت الـ assign)
    let orderBy = { worksheetOrder: "asc" };
    if (sortOrder === "asc" || sortOrder === "desc") {
      orderBy = { finalBalance: sortOrder };
    }

    const [accounts, total] = await prisma.$transaction([
      prisma.trialBalanceAccount.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          assignedAccountGuide: {
            select: {
              id: true,
              accountNumber: true,
              accountName: true,
              level: true,
            },
          },
        },
      }),
      prisma.trialBalanceAccount.count({ where }),
    ]);

    res.status(200).json({
      data: accounts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      status: trialBalance.status,
    });
  } catch (error) {
    console.error("Get Assigned Worksheet Error:", error);
    next(error);
  }
};

/**
 * تعيين (Assign) حسابات ميزان المراجعة لحسابات من دليل الحسابات
 * يقبل مصفوفة من التعيينات ويمكن تعيين حساب واحد أو أكثر أو الكل دفعة واحدة
 * Body: { assignments: [{ accountId: "uuid", accountGuideId: 1 }, ...] }
 */
exports.assignAccounts = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res
        .status(400)
        .json({ message: "يرجى إرسال مصفوفة التعيينات (assignments)." });
    }

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
    });

    if (!trialBalance) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على ميزان مراجعة لهذا العقد." });
    }

    // التحقق من أن جميع الحسابات تنتمي لميزان المراجعة هذا
    const accountIds = assignments.map((a) => a.accountId);
    const accounts = await prisma.trialBalanceAccount.findMany({
      where: {
        id: { in: accountIds },
        trialBalanceId: trialBalance.id,
      },
    });

    if (accounts.length !== accountIds.length) {
      return res
        .status(400)
        .json({ message: "بعض الحسابات المرسلة غير موجودة في ميزان المراجعة." });
    }

    // التحقق من أن جميع الـ accountGuideIds موجودة وتنتمي لنفس الـ subscriber
    const subscriberId = req.user.subscriberId;
    const guideIds = [...new Set(assignments.map((a) => a.accountGuideId))];
    const guides = await prisma.accountGuide.findMany({
      where: {
        id: { in: guideIds },
        subscriberId: Number(subscriberId),
      },
    });

    if (guides.length !== guideIds.length) {
      return res
        .status(400)
        .json({ message: "بعض حسابات دليل الحسابات المرسلة غير موجودة." });
    }

    // تنفيذ التعيينات - يحتفظ بالـ worksheetOrder اللي اتحفظ من saveSort
    const updates = assignments.map((a) =>
      prisma.trialBalanceAccount.update({
        where: { id: a.accountId },
        data: { assignedAccountGuideId: a.accountGuideId },
      })
    );

    await prisma.$transaction(updates);

    res.status(200).json({
      message: `تم تعيين ${assignments.length} حساب بنجاح.`,
      assignedCount: assignments.length,
    });
  } catch (error) {
    console.error("Assign Accounts Error:", error);
    next(error);
  }
};

/**
 * إعادة تعيين (Re-assign) حساب تم ربطه مسبقاً لحساب آخر من دليل الحسابات
 * Body: { accountGuideId: 1 }
 */
exports.reassignAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { accountGuideId } = req.body;

    if (!accountGuideId) {
      return res
        .status(400)
        .json({ message: "يرجى إرسال accountGuideId الجديد." });
    }

    const account = await prisma.trialBalanceAccount.findUnique({
      where: { id: accountId },
      include: { trialBalance: true },
    });

    if (!account) {
      return res.status(404).json({ message: "الحساب غير موجود." });
    }

    if (!account.assignedAccountGuideId) {
      return res
        .status(400)
        .json({ message: "هذا الحساب غير معيّن. استخدم endpoint التعيين بدلاً من ذلك." });
    }

    // التحقق من أن الـ accountGuide ينتمي لنفس الـ subscriber
    const subscriberId = req.user.subscriberId;
    const guide = await prisma.accountGuide.findFirst({
      where: {
        id: accountGuideId,
        subscriberId: Number(subscriberId),
      },
    });

    if (!guide) {
      return res
        .status(404)
        .json({ message: "حساب دليل الحسابات غير موجود." });
    }

    const updated = await prisma.trialBalanceAccount.update({
      where: { id: accountId },
      data: { assignedAccountGuideId: accountGuideId },
      include: {
        assignedAccountGuide: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            level: true,
          },
        },
      },
    });

    res.status(200).json({
      message: "تم إعادة تعيين الحساب بنجاح.",
      data: updated,
    });
  } catch (error) {
    console.error("Reassign Account Error:", error);
    next(error);
  }
};

/**
 * إلغاء تعيين حساب (Unassign) - إرجاعه لتبويبة Unassigned
 */
exports.unassignAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.trialBalanceAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return res.status(404).json({ message: "الحساب غير موجود." });
    }

    if (!account.assignedAccountGuideId) {
      return res.status(400).json({ message: "هذا الحساب غير معيّن أصلاً." });
    }

    const updated = await prisma.trialBalanceAccount.update({
      where: { id: accountId },
      data: { assignedAccountGuideId: null, worksheetOrder: null },
    });

    res.status(200).json({
      message: "تم إلغاء تعيين الحساب بنجاح.",
      data: updated,
    });
  } catch (error) {
    console.error("Unassign Account Error:", error);
    next(error);
  }
};
