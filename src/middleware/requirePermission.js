const { ROLE_PERMISSIONS, ROLES } = require('../config/roles');

const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // --- DEBUG LOGS (Remove in Production) ---
      console.log("🔍 Permission Check Debug:");
      console.log("👉 User Role:", user.role);
      console.log("👉 Required Permission:", permission);
      console.log("👉 Available Permissions for Role:", ROLE_PERMISSIONS[user.role]);
      // -----------------------------------------

      // 1. SUBSCRIBER_OWNER has full access automatically
      if (user.role === ROLES.SUBSCRIBER_OWNER) {
        return next();
      }

      // 2. Get permissions from Role
      const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

      // 3. Get permissions from User override (if any)
      let userPermissions = [];
      if (user.permissions) {
          // Handle if permissions is stored as string or object
          userPermissions = typeof user.permissions === 'string' 
            ? JSON.parse(user.permissions) 
            : user.permissions;
      }

      // 4. Check if permission exists in either Role or User overrides
      if (rolePermissions.includes(permission) || (Array.isArray(userPermissions) && userPermissions.includes(permission))) {
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
