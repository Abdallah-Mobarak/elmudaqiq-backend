const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const resolveTenant = require("../middleware/resolveTenant.middleware");

router.post("/login", resolveTenant, authController.login);
router.post("/send-otp", resolveTenant, authController.sendOTP);
router.post("/verify-otp", resolveTenant, authController.verifyOTP);
router.post("/reset-password", resolveTenant, authController.resetPassword);
router.post("/change-password", authMiddleware, authController.changePassword);

// Protected Route (must send token)
router.get("/profile", authMiddleware, authController.profile);
router.get("/all-users", authMiddleware, adminMiddleware, authController.getAllUsers);





module.exports = router;
