const prisma = require("../config/prisma");
const notify = require("../utils/notify");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../config/notificationTypes");

/**
 * Check active subscriptions for expiry state and send notifications.
 * Notifies the subscriber owner + the admin feed.
 *
 * Thresholds:
 *   - 7 days remaining  → warn owner + admins
 *   - 1 day remaining   → warn owner + admins
 *   - expired           → notify admins, mark subscription EXPIRED
 */
const checkAndSendRenewalNotifications = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: {
      subscriber: { select: { id: true, licenseName: true, lastRenewalNotification: true } },
      plan: { select: { name: true } },
    },
  });

  for (const sub of activeSubscriptions) {
    const endDate = new Date(sub.endDate);
    endDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Prevent duplicate notifications within the same day per subscriber
    if (
      sub.subscriber.lastRenewalNotification &&
      new Date(sub.subscriber.lastRenewalNotification).toDateString() === today.toDateString()
    ) {
      continue;
    }

    // Case: expired → mark + notify admins
    if (diffDays < 0) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
      await prisma.subscriber.update({
        where: { id: sub.subscriberId },
        data: { renewalStatus: "NOT_RENEWED" },
      });

      const payload = {
        title: "اشتراك منتهي",
        message: `انتهى اشتراك (${sub.subscriber.licenseName}) على باقة (${sub.plan.name}).`,
        type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED,
        entityType: ENTITY_TYPES.SUBSCRIPTION,
        entityId: sub.id,
        sendEmail: true,
      };
      await notify.notifyAdmins(payload);
      await notify.notifySubscriberOwner(sub.subscriberId, payload);
      continue;
    }

    // Case: 7 or 1 day warning
    if (diffDays === 7 || diffDays === 1) {
      const payload = {
        title: "تنبيه انتهاء الاشتراك",
        message:
          diffDays === 1
            ? `اشتراك (${sub.subscriber.licenseName}) سينتهي غداً.`
            : `اشتراك (${sub.subscriber.licenseName}) سينتهي خلال 7 أيام.`,
        type: NOTIFICATION_TYPES.SUBSCRIPTION_RENEWAL_DUE,
        entityType: ENTITY_TYPES.SUBSCRIPTION,
        entityId: sub.id,
        // Email only on the last day to avoid inbox spam
        sendEmail: diffDays === 1,
      };

      await notify.notifyAdmins(payload);
      await notify.notifySubscriberOwner(sub.subscriberId, payload);

      await prisma.subscriber.update({
        where: { id: sub.subscriberId },
        data: { lastRenewalNotification: today, renewalStatus: "PENDING" },
      });
    }
  }

  return true;
};

module.exports = { checkAndSendRenewalNotifications };
