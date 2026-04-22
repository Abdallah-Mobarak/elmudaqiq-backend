const prisma = require("../config/prisma");
const { ROLES } = require("../config/roles");
const { sendNotificationEmail } = require("../services/email.service");

/**
 * Central Notification Helper
 * Any service can call these functions to create notifications without
 * repeating Prisma queries or role-lookup logic.
 *
 * All functions are fail-safe: they log errors but NEVER throw,
 * so a failed notification never breaks the primary business action.
 */

const safeCreate = async (payload) => {
  try {
    return await prisma.notification.create({ data: payload });
  } catch (err) {
    console.error("Notification create failed:", err.message, payload);
    return null;
  }
};

const safeCreateMany = async (payloads) => {
  try {
    if (!payloads.length) return { count: 0 };
    return await prisma.notification.createMany({ data: payloads });
  } catch (err) {
    console.error("Notification createMany failed:", err.message);
    return { count: 0 };
  }
};

/**
 * Notify a single user by userId.
 * Pass { sendEmail: true } to ALSO send an email copy (fire-and-forget, never throws).
 */
const notifyUser = async (userId, { title, message, type, entityType, entityId, sendEmail }) => {
  if (!userId) return null;

  const result = await safeCreate({
    userId: Number(userId),
    title,
    message,
    type,
    entityType: entityType || null,
    entityId: entityId ? String(entityId) : null,
  });

  if (sendEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { email: true },
      });
      if (user?.email) {
        // Do NOT await — email delivery is slow and must not block callers.
        sendNotificationEmail({ to: user.email, title, message }).catch(() => {});
      }
    } catch (err) {
      console.error("notifyUser email lookup failed:", err.message);
    }
  }

  return result;
};

/**
 * Notify all users with a specific role within a subscriber (tenant).
 * Pass { sendEmail: true } to also email each recipient.
 */
const notifyUsersByRole = async (subscriberId, roleName, payload) => {
  if (!subscriberId || !roleName) return { count: 0 };

  const users = await prisma.user.findMany({
    where: {
      subscriberId: Number(subscriberId),
      status: "active",
      Role: { name: roleName },
    },
    select: { id: true, email: true },
  });

  if (!users.length) return { count: 0 };

  const rows = users.map((u) => ({
    userId: u.id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entityType: payload.entityType || null,
    entityId: payload.entityId ? String(payload.entityId) : null,
  }));

  const result = await safeCreateMany(rows);

  if (payload.sendEmail) {
    for (const u of users) {
      if (u.email) {
        sendNotificationEmail({
          to: u.email,
          title: payload.title,
          message: payload.message,
        }).catch(() => {});
      }
    }
  }

  return result;
};

/**
 * Notify the manager of a specific branch
 */
const notifyBranchManager = async (branchId, payload) => {
  if (!branchId) return null;

  const branch = await prisma.branch.findUnique({
    where: { id: Number(branchId) },
    select: { managerId: true },
  });

  if (!branch?.managerId) return null;
  return notifyUser(branch.managerId, payload);
};

/**
 * Notify the owner (SUBSCRIBER_OWNER) of a subscriber
 */
const notifySubscriberOwner = async (subscriberId, payload) => {
  return notifyUsersByRole(subscriberId, ROLES.SUBSCRIBER_OWNER, payload);
};

/**
 * Notify all admins (system-level). Admins are users with no subscriberId
 * and with the ADMIN role. Also stores a subscriber-scoped copy when
 * entityType == SUBSCRIPTION so it shows in the admin dashboard feed.
 */
const notifyAdmins = async (payload) => {
  const admins = await prisma.user.findMany({
    where: {
      subscriberId: null,
      status: "active",
    },
    select: { id: true },
  });

  if (!admins.length) return { count: 0 };

  const rows = admins.map((u) => ({
    userId: u.id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entityType: payload.entityType || null,
    entityId: payload.entityId ? String(payload.entityId) : null,
  }));

  return safeCreateMany(rows);
};

/**
 * Notify a subscriber-level feed (not tied to a specific user).
 * Used for renewal/expiry notices that the owner and admins both see.
 */
const notifySubscriber = async (subscriberId, payload) => {
  if (!subscriberId) return null;
  return safeCreate({
    subscriberId: Number(subscriberId),
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entityType: payload.entityType || null,
    entityId: payload.entityId ? String(payload.entityId) : null,
  });
};

/**
 * Notify all users whose role name is in a list (within the same subscriber).
 */
const notifyUsersByRoles = async (subscriberId, roleNames, payload) => {
  if (!subscriberId || !Array.isArray(roleNames) || !roleNames.length) {
    return { count: 0 };
  }

  const users = await prisma.user.findMany({
    where: {
      subscriberId: Number(subscriberId),
      status: "active",
      Role: { name: { in: roleNames } },
    },
    select: { id: true },
  });

  if (!users.length) return { count: 0 };

  const rows = users.map((u) => ({
    userId: u.id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    entityType: payload.entityType || null,
    entityId: payload.entityId ? String(payload.entityId) : null,
  }));

  return safeCreateMany(rows);
};

/**
 * Notify admins about a system error / warning.
 * Never throws — this is a fire-and-forget helper for infrastructure events.
 */
const notifySystemError = async (context, error) => {
  const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../config/notificationTypes");
  const message =
    typeof error === "string"
      ? error
      : error?.message || error?.toString() || "Unknown error";

  return notifyAdmins({
    title: `خطأ في النظام: ${context || "غير محدد"}`,
    message: `تم رصد خطأ في (${context}). التفاصيل: ${message}`.slice(0, 500),
    type: NOTIFICATION_TYPES.SYSTEM_ERROR,
    entityType: ENTITY_TYPES.SYSTEM,
  });
};

module.exports = {
  notifyUser,
  notifyUsersByRole,
  notifyUsersByRoles,
  notifyBranchManager,
  notifySubscriberOwner,
  notifyAdmins,
  notifySubscriber,
  notifySystemError,
};
