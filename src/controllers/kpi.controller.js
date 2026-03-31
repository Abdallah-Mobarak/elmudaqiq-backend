const kpiService = require("../services/kpi.service");
const prisma = require("../config/prisma");
const fs = require("fs");
const path = require("path");

module.exports = {

getSubscribersStats: async (req, res, next) => {
    try {
      const data = await kpiService.getSubscribersStats(req.query);

      res.json({
        message: "Subscribers KPI loaded successfully",
        data
      });
    } catch (err) {
      next(err);
    }
  },

getFilesKPI: async (req, res, next) => {
  try {
    const data = await kpiService.getFilesKPI(req.query);

    res.json({
      message: "Files KPI loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
  },

getComplaintsKPI: async (req, res, next) => {
  try {
    const data = await kpiService.getComplaintsKPI(req.query);

    res.json({
      message: "Complaints KPI loaded successfully",
      data
    });

  } catch (err) {
    next(err);
  }
  },

getYearlyProfitKPI: async (req, res, next) => {
  try {
    const { year } = req.query;

    const data = await kpiService.getYearlyProfitKPI({ year });

    res.json({
      message: "Yearly profit KPI loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
  },


getAllYearsMonthlyProfitKPI: async (req, res, next) => {
  try {
    const data = await kpiService.getAllYearsMonthlyProfitKPI();

    res.json({
      message: "All years monthly profit KPI loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
},



// أضف هذه الدالة داخل module.exports في ملف kpi.controller.js

getSubscriberStats: async (req, res) => {
  try {
    // التحقق من صلاحية المستخدم (يجب أن يكون مالك/مدير المشترك فقط)
    if (req.user.role !== "SUBSCRIBER_OWNER") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. Only the Subscriber Owner can view these statistics." 
      });
    }

    // 1. استخراج الـ subscriberId الخاص بالمستخدم الحالي
    const subscriberId = Number(req.user.subscriberId);
    
    // استخراج الفلاتر (مثل الفرع والتاريخ إن وجد)
    const { branchId } = req.query;

    if (!subscriberId) {
      return res.status(400).json({ message: "Subscriber ID is missing from token." });
    }

    // 2. حساب إجمالي المستخدمين لهذا المشترك
    const totalUsers = await prisma.user.count({
      where: { subscriberId },
    });

    // 3. إحصائيات التذاكر (Complaints)
    // نعتمد على حقل response لمعرفة حالة التذكرة بدلاً من status
    const [openTickets, closedTickets] = await Promise.all([
      prisma.complaint.count({ where: { subscriberId, response: null } }),
      prisma.complaint.count({ where: { subscriberId, response: { not: null } } })
    ]);

    const totalTickets = openTickets + closedTickets;
    const openPercentage = totalTickets > 0 ? ((openTickets / totalTickets) * 100).toFixed(2) : 0;
    const closedPercentage = totalTickets > 0 ? ((closedTickets / totalTickets) * 100).toFixed(2) : 0;

    // 4. إحصائيات العقود (Contracts) مع فلتر الفرع (Branch)
    const contractWhereClause = { subscriberId };
    
    // فلترة بناءً على الفرع في حال تم تمريره
    if (branchId) {
      contractWhereClause.branchId = Number(branchId);
    }

    const contractsGroup = await prisma.engagementContract.groupBy({
      by: ['status'], // الحالات المذكورة في النظام: 'ACTIVE', 'INACTIVE', 'ARCHIVE'
      where: contractWhereClause,
      _count: { id: true }
    });

    let activeContracts = 0;
    let inactiveContracts = 0;
    let archivedContracts = 0;

    contractsGroup.forEach(c => {
      if (c.status === 'ACTIVE') activeContracts = c._count.id;
      if (c.status === 'INACTIVE') inactiveContracts = c._count.id;
      if (c.status === 'ARCHIVE') archivedContracts = c._count.id;
    });

    const totalContracts = activeContracts + inactiveContracts + archivedContracts;

    // 5. إحصائيات الملفات (Files & Storage)
    // جلب مسارات جميع المرفقات المرتبطة بعقود هذا المشترك
    const contractDocuments = await prisma.contractDocument.findMany({
      where: { contract: { subscriberId } },
      select: { filePath: true }
    });

    let totalSizeBytes = 0;
    let validFilesCount = 0;

    // قراءة حجم كل ملف فعلياً من مجلد السيرفر
    contractDocuments.forEach((doc) => {
      if (doc.filePath) {
        const absolutePath = path.resolve(doc.filePath);
        if (fs.existsSync(absolutePath)) {
          const stats = fs.statSync(absolutePath);
          totalSizeBytes += stats.size; // تجميع الحجم بالبايت
          validFilesCount++;
        }
      }
    });

    const totalFilesCreated = validFilesCount;
    const totalFileSizeUsed = (totalSizeBytes / (1024 * 1024)).toFixed(2) + " MB"; // تحويل لـ ميجا بايت

    // 6. إرجاع النتيجة
    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers
        },
        files: {
          totalFiles: totalFilesCreated,
          totalSizeUsed: totalFileSizeUsed
        },
        complaints: {
          total: totalTickets,
          open: openTickets,
          closed: closedTickets,
          percentages: {
            open: `${openPercentage}%`,
            closed: `${closedPercentage}%`
          }
        },
        contracts: {
          filteredByBranch: branchId ? Number(branchId) : 'All Branches',
          total: totalContracts,
          active: activeContracts,
          inactive: inactiveContracts,
          archived: archivedContracts
        }
      }
    });

  } catch (error) {
    console.error("Error in getSubscriberStats:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}











};
