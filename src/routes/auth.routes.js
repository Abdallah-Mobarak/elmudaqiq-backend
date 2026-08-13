const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const resolveTenant = require("../middleware/resolveTenant.middleware");
const uploadImage = require("../middleware/uploadImage");
const rateLimit = require("../middleware/rateLimit.middleware");

// Credential and OTP endpoints are the ones worth brute-forcing, so they are the
// ones that get a budget. Keyed on the email under attack as well as the caller,
// so one attacker cannot lock every user out of the system.
const byEmail = (req) => req.body?.email;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  identify: byEmail,
  message: "عدد محاولات تسجيل دخول كبير. برجاء المحاولة بعد 15 دقيقة.",
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  identify: byEmail,
  message: "عدد طلبات كبير. برجاء المحاولة بعد 15 دقيقة.",
});

router.post("/login", loginLimiter, resolveTenant, authController.login);
router.post("/send-otp", otpLimiter, resolveTenant, authController.sendOTP);
router.post("/verify-otp", otpLimiter, resolveTenant, authController.verifyOTP);
router.post("/reset-password", otpLimiter, resolveTenant, authController.resetPassword);
router.post("/change-password", authMiddleware, authController.changePassword);

// Protected Route (must send token)
router.get("/profile", authMiddleware, authController.profile);
router.put("/profile", authMiddleware, uploadImage.single("profilePicture"), authController.updateProfile);
router.get("/all-users", authMiddleware, adminMiddleware, authController.getAllUsers);





module.exports = router;
