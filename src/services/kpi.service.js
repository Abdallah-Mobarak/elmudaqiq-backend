const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  getSubscribersStats: async ({ mode, date, year, month, from, to }) => {

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

    // ✅ Current period total
    const currentTotal = await prisma.subscriber.count({
      where: {
        createdAt: {
          gte: currentStart,
          lt: currentEnd
        }
      }
    });

    // ✅ Previous period total
    const previousTotal = await prisma.subscriber.count({
      where: {
        createdAt: {
          gte: previousStart,
          lt: previousEnd
        }
      }
    });

    // ✅ Percentage Calculation
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

 getFilesKPI: async ({ mode, date, year, month, from, to }) => {

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

  //  SIZE percentage
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
    
    //  SIZE KPI
    totalSizeBytes: currentSizeBytes,
    totalSizeMB: Number((currentSizeBytes / (1024 * 1024)).toFixed(2)),
    totalSizeGB: Number((currentSizeBytes / (1024 * 1024 * 1024)).toFixed(2)),

    previousSizeBytes,
    sizeChangePercentage: Number(sizeChangePercentage.toFixed(2)),
    sizeTrend: sizeChangePercentage >= 0 ? "UP" : "DOWN"
  };
},


};
