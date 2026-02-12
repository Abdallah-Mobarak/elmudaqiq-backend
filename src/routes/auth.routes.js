const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

router.post("/login", authController.login);
router.post("/send-otp", authController.sendOTP);
router.post("/verify-otp", authController.verifyOTP);
router.post("/reset-password", authController.resetPassword);


// Protected Route (must send token)
router.get("/profile", authMiddleware, authController.profile);
router.get("/all-users", authMiddleware, adminMiddleware, authController.getAllUsers);





module.exports = router;
