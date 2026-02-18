const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const logActivity = require("../utils/logActivity");
const authService = require("../services/auth.service");

module.exports = {

  // ===============================
  // LOGIN (ADMIN + SUBSCRIBER)
  // ===============================
  login: async (req, res, next) => {
    try {
      const isSubscriberLogin = !!req.subscriber;

      const data = await authService.login({
        email: req.body.email,
        password: req.body.password,
        subscriberId: isSubscriberLogin ? req.subscriber.id : null
      });

      // Log Activity
      await logActivity({
        userId: data.user.id,
        userType: isSubscriberLogin ? "SUBSCRIBER" : "ADMIN",
        action: "LOGIN",
        message: isSubscriberLogin
          ? "Subscriber user logged in successfully"
          : "Admin logged in successfully",
        subscriberId: isSubscriberLogin ? req.subscriber.id : null,
        req
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // ===============================
  // SEND OTP
  // ===============================
  sendOTP: async (req, res, next) => {
    try {
      const isSubscriber = !!req.subscriber;

      const data = await authService.sendOTP({
        email: req.body.email,
        subscriberId: isSubscriber ? req.subscriber.id : null
      });

      res.json(data);
      
    } catch (err) {
      next(err);
    }
  },

  // ===============================
  // VERIFY OTP
  // ===============================
  verifyOTP: async (req, res, next) => {
    try {
      const isSubscriber = !!req.subscriber;

      const data = await authService.verifyOTP({
        email: req.body.email,
        otp: req.body.otp,
        subscriberId: isSubscriber ? req.subscriber.id : null
      });
 
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // ===============================
  // RESET PASSWORD
  // ===============================
  resetPassword: async (req, res, next) => {
    try {
      const isSubscriber = !!req.subscriber;

      const data = await authService.resetPassword({
        email: req.body.email,
        otp: req.body.otp,
        newPassword: req.body.newPassword,
        subscriberId: isSubscriber ? req.subscriber.id : null
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // ===============================
  // PROFILE (JWT REQUIRED)
  // ===============================
  profile: async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          roleId: true,
          subscriberId: true,
          createdAt: true
        }
      });

      res.json({
        message: "Profile loaded successfully",
        user
      });
    } catch (err) {
      next(err);
    }
  },

  // ===============================
  // GET ALL USERS (ADMIN ONLY)
  // ===============================
  getAllUsers: async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          roleId: true,
          subscriberId: true,
          createdAt: true
        }
      });

      res.json({ users });
    } catch (err) {
      next(err);
    }
  },

  // ===============================
  // CHANGE PASSWORD (LOGGED IN USER)
  // ===============================
  changePassword: async (req, res, next) => {
    try {
      const data = await authService.changePassword({
        userId: req.user.id,
        oldPassword: req.body.oldPassword,
        newPassword: req.body.newPassword
      });
  
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
  
};
