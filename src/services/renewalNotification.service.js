const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const notificationService = require("./notification.service");

module.exports = {

  // Check subscriptions and send auto renewal notifications
  checkAndSendRenewalNotifications: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscribers = await prisma.subscriber.findMany({
      where: {
        subscriptionEndDate: { not: null },
      },
    });

    for (const subscriber of subscribers) {
      const endDate = new Date(subscriber.subscriptionEndDate);
      endDate.setHours(0, 0, 0, 0);

      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Prevent duplicate notifications in the same day
      if (
        subscriber.lastRenewalNotification &&
        new Date(subscriber.lastRenewalNotification).toDateString() === today.toDateString()
      ) {
        continue;
      }

      // Case: Subscription expired
      if (diffDays < 0) {
        await prisma.subscriber.update({
          where: { id: subscriber.id },
          data: { renewalStatus: "NOT_RENEWED" },
        });
        continue;
      }

      // Case: 7 days before expiry
      if (diffDays === 7) {
        await notificationService.create({
          title: "Subscription Expiry Warning",
          message: `Subscription of ${subscriber.licenseName} will expire in 7 days`,
          type: "RENEWAL",
          subscriberId: subscriber.id,
        });

        await prisma.subscriber.update({
          where: { id: subscriber.id },
          data: {
            lastRenewalNotification: today,
            renewalStatus: "PENDING",
          },
        });
      }

      // Case: 1 day before expiry
      if (diffDays === 1) {
        await notificationService.create({
          title: "Subscription Expiry Warning",
          message: `Subscription of ${subscriber.licenseName} will expire tomorrow`,
          type: "RENEWAL",
          subscriberId: subscriber.id,
        });

        await prisma.subscriber.update({
          where: { id: subscriber.id },
          data: {
            lastRenewalNotification: today,
            renewalStatus: "PENDING",
          },
        });
      }

      // Case: Renewed manually (future date far away)
      if (diffDays > 7) {
        if (subscriber.renewalStatus !== "RENEWED") {
          await prisma.subscriber.update({
            where: { id: subscriber.id },
            data: { renewalStatus: "RENEWED" },
          });
        }
      }
    }

    return true;
  },

};
