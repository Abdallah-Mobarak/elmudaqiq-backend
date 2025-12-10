const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  // ===============================
  //  SUBSCRIBERS KPI
  // ===============================
  getSubscribersStats: async ({ mode, date, year, month, from, to }) => {

    year = year ? Number(year) : null;
    month = month ? Number(month) : null;

    let currentStart, currentEnd, previousStart, previousEnd;

    // -------- DAY MODE --------
    if (mode === "day") {
      currentStart = new Date(`${date}T00:00:00`);
      currentEnd   = new Date(`${date}T23:59:59`);

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);

      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 1);
    }

    // -------- MONTH MODE --------
    if (mode === "month") {
      currentStart = new Date(year, month - 1, 1);
      currentEnd   = new Date(year, month, 1);

      previousStart = new Date(year, month - 2, 1);
      previousEnd   = new Date(year, month - 1, 1);
    }

    // -------- YEAR MODE --------
    if (mode === "year") {
      currentStart = new Date(year, 0, 1);
      currentEnd   = new Date(year + 1, 0, 1);

      previousStart = new Date(year - 1, 0, 1);
      previousEnd   = new Date(year, 0, 1);
    }

    // -------- CUSTOM MODE --------
    if (mode === "custom") {
      currentStart = new Date(from);
      currentEnd   = new Date(to);

      const diff = currentEnd - currentStart;

      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd - diff);
    }

    const currentTotal = await prisma.subscriber.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: currentEnd
        }
      }
    });

    const previousTotal = await prisma.subscriber.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: previousEnd
        }
      }
    });

    let changePercentage = 0;
    if (previousTotal > 0) {
      changePercentage = ((currentTotal - previousTotal) / previousTotal) * 100;
    }

    return {
      total: currentTotal,
      previousTotal,
      changePercentage: Number(changePercentage.toFixed(2)),
      trend: changePercentage >= 0 ? "UP" : "DOWN",
    };
  },

  // ===============================
  //  FILES KPI (COUNT + SIZE)
  // ===============================
  getFilesKPI: async ({ mode, date, year, month, from, to }) => {

    year = year ? Number(year) : null;
    month = month ? Number(month) : null;

    let currentStart, currentEnd, previousStart, previousEnd;

    // -------- DAY MODE --------
    if (mode === "day") {
      currentStart = new Date(`${date}T00:00:00`);
      currentEnd   = new Date(`${date}T23:59:59`);

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);

      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 1);
    }

    // -------- MONTH MODE --------
    if (mode === "month") {
      currentStart = new Date(year, month - 1, 1);
      currentEnd   = new Date(year, month, 1);

      previousStart = new Date(year, month - 2, 1);
      previousEnd   = new Date(year, month - 1, 1);
    }

    // -------- YEAR MODE --------
    if (mode === "year") {
      currentStart = new Date(year, 0, 1);
      currentEnd   = new Date(year + 1, 0, 1);

      previousStart = new Date(year - 1, 0, 1);
      previousEnd   = new Date(year, 0, 1);
    }

    // -------- CUSTOM MODE --------
    if (mode === "custom") {
      currentStart = new Date(from);
      currentEnd   = new Date(to);

      const diff = currentEnd - currentStart;

      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd - diff);
    }

    // Current period files count
    const currentTotal = await prisma.uploadedFile.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: currentEnd
        }
      }
    });

    // Previous period files count
    const previousTotal = await prisma.uploadedFile.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: previousEnd
        }
      }
    });

    // Current total size
    const currentSize = await prisma.uploadedFile.aggregate({
      _sum: { size: true },
      where: {
        createdAt: {
          gte: currentStart,
          lt: currentEnd
        }
      }
    });

    // Previous total size
    const previousSize = await prisma.uploadedFile.aggregate({
      _sum: { size: true },
      where: {
        createdAt: {
          gte: previousStart,
          lt: previousEnd
        }
      }
    });

    const currentSizeBytes = currentSize._sum.size || 0;
    const previousSizeBytes = previousSize._sum.size || 0;

    // FILES percentage
    let filesChangePercentage = 0;
    if (previousTotal > 0) {
      filesChangePercentage =
        ((currentTotal - previousTotal) / previousTotal) * 100;
    }

    // SIZE percentage
    let sizeChangePercentage = 0;
    if (previousSizeBytes > 0) {
      sizeChangePercentage =
        ((currentSizeBytes - previousSizeBytes) / previousSizeBytes) * 100;
    }

    return {
      // FILES KPI
      totalFiles: currentTotal,
      previousTotalFiles: previousTotal,
      filesChangePercentage: Number(filesChangePercentage.toFixed(2)),
      filesTrend: filesChangePercentage >= 0 ? "UP" : "DOWN",
      
      // SIZE KPI
      totalSizeBytes: currentSizeBytes,
      totalSizeMB: Number((currentSizeBytes / (1024 * 1024)).toFixed(2)),
      totalSizeGB: Number((currentSizeBytes / (1024 * 1024 * 1024)).toFixed(2)),

      previousSizeBytes,
      sizeChangePercentage: Number(sizeChangePercentage.toFixed(2)),
      sizeTrend: sizeChangePercentage >= 0 ? "UP" : "DOWN"
    };
  },

  // ===============================
  //  COMPLAINTS KPI (OPEN / CLOSED / PENDING)
  // ===============================
  getComplaintsKPI: async ({ mode, date, year, month, from, to }) => {

    year = year ? Number(year) : null;
    month = month ? Number(month) : null;

    let currentStart, currentEnd;

    // -------- DAY MODE --------
    if (mode === "day") {
      currentStart = new Date(`${date}T00:00:00`);
      currentEnd   = new Date(`${date}T23:59:59`);
    }

    // -------- MONTH MODE --------
    if (mode === "month") {
      currentStart = new Date(year, month - 1, 1);
      currentEnd   = new Date(year, month, 1);
    }

    // -------- YEAR MODE --------
    if (mode === "year") {
      currentStart = new Date(year, 0, 1);
      currentEnd   = new Date(year + 1, 0, 1);
    }

    // -------- CUSTOM MODE --------
    if (mode === "custom") {
      currentStart = new Date(from);
      currentEnd   = new Date(to);
    }

    const total = await prisma.complaint.count({
      where: {
        createdAt: { gte: currentStart, lt: currentEnd }
      }
    });

    const open = await prisma.complaint.count({
      where: {
        response: null,
        createdAt: { gte: currentStart, lt: currentEnd }
      }
    });

    const closed = await prisma.complaint.count({
      where: {
        response: { not: null },
        createdAt: { gte: currentStart, lt: currentEnd }
      }
    });

    const pending = open;

    return {
      total,
      open,
      closed,
      pending
    };
  },

  getYearlyProfitKPI: async ({ year }) => {

  const safeYear = Number(year); //  تحويل آمن لرقم

  const startDate = new Date(safeYear, 0, 1);       // 1 Jan
  const endDate   = new Date(safeYear + 1, 0, 1);   // 1 Jan السنة اللي بعدها

  //  إجمالي أرباح السنة
  const totalIncomeResult = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: "PAID",
      paidAt: {
        gte: startDate,
        lt: endDate
      }
    }
  });

  const totalIncome = totalIncomeResult._sum.amount || 0;

  //  أرباح كل شهر داخل السنة
  const monthly = [];

  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(safeYear, month, 1);
    const monthEnd   = new Date(safeYear, month + 1, 1);

    const monthResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        paidAt: {
          gte: monthStart,
          lt: monthEnd
        }
      }
    });

    monthly.push({
      month: month + 1, // 1 → 12
      total: monthResult._sum.amount || 0
    });
  }

  return {
    year: safeYear,
    totalIncome,
    monthly
  };
  },

   getAllYearsMonthlyProfitKPI: async () => {

  //  إجمالي الأرباح عبر كل السني
  const totalResult = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: "PAID"
    }
  });

  const totalIncomeAllTime = totalResult._sum.amount || 0;

  //  أرباح كل الشهور (مجمع من كل السنين)
  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID"
    },
    select: {
      amount: true,
      paidAt: true
    }
  });

  const monthlyTotals = Array(12).fill(0);

  for (const p of payments) {
    const monthIndex = new Date(p.paidAt).getMonth(); // 0 → 11
    monthlyTotals[monthIndex] += Number(p.amount);
  }

  return {
    type: "ALL_YEARS",
    totalIncomeAllTime, //  الرقم الكبير فوق الجراف
    monthly: monthlyTotals.map((total, index) => ({
      month: index + 1,   // 1 → 12
      total
    }))
  };
  }


};
