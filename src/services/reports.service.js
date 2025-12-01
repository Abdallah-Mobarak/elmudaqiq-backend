const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getRenewalReport = async () => {
  const now = new Date();

  const subscribers = await prisma.subscriber.findMany({
    include: {
      country: { select: { name: true } },
      city: { select: { name: true } },
    },
  });

  const report = subscribers.map((s) => {
    let status = s.renewalStatus;

    if (s.subscriptionEndDate) {
      if (new Date(s.subscriptionEndDate) < now) {
        status = "NOT_RENEWED";
      }
    }

    return {
      id: s.id,
      name: s.licenseName,
      email: s.subscriberEmail,
      phone: s.primaryMobile,
      country: s.country?.name,
      city: s.city?.name,
      startDate: s.subscriptionStartDate,
      endDate: s.subscriptionEndDate,
      lastNotification: s.lastRenewalNotification,
      renewalStatus: status,
    };
  });

  return report;
};
