const { PrismaClient } = require("@prisma/client");
const { ROLE_PERMISSIONS } = require('../config/rolePermissions');
const { ROLES } = require('../config/roles');

const prisma = new PrismaClient();

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 1. SUBSCRIBER_OWNER has full access automatically
      if (user.role === ROLES.SUBSCRIBER_OWNER) {
        return next();
      }

      // 2. Get permissions from Role
      const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

      // 3. Check if permission exists in Role (Fast check)
      if (rolePermissions.includes("ALL_ACCESS") || rolePermissions.includes(permission)) {
        return next();
      }

      // 4. If not in Role, Check User Overrides from DB (Dynamic Fetch)
      const dbUser = await prisma.user.findUnique({
        where: { id: Number(user.id) },
        select: { permissions: true }
      });

      const userPermissions = dbUser?.permissions ? (typeof dbUser.permissions === 'string' ? JSON.parse(dbUser.permissions) : dbUser.permissions) : [];

      if (Array.isArray(userPermissions) && userPermissions.includes(permission)) {
        return next();
      }

      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });

    } catch (error) {
      console.error("Permission Middleware Error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
};

module.exports = requirePermission;
