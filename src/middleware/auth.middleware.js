const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      subscriberId: decoded.subscriberId,
      branchId: decoded.branchId,
      mustChangePassword: decoded.mustChangePassword
    };

    //  Force Change Password Check
    if (
      decoded.mustChangePassword &&
      req.path !== "/change-password"
    ) {
      return res.status(403).json({
        message: "You must change your password before continuing"
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
