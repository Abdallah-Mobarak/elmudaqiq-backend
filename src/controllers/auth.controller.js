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
  
        include: {
          Role: {
            select: {
              id: true,
              name: true
            }
          },
  
          branch: {
            select: {
              id: true,
              name: true,
              cityName: true,
              status: true
            }
          },
  
          managedBranch: {
            select: {
              id: true,
              name: true
            }
          },
  
          subscriber: {
            include: {
  
              country: {
                select: {
                  id: true,
                  name: true
                }
              },
  
              city: {
                select: {
                  id: true,
                  name: true
                }
              },
  
              subscriptions: {
                where: {
                  status: "ACTIVE"
                },
                take: 1,
                include: {
                  plan: {
                    select: {
                      id: true,
                      name: true,
                      durationMonths: true,
                      usersLimit: true,
                      branchesLimit: true
                    }
                  }
                }
              }
  
            }
          }
  
        }
  
      });
  
      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }
  
      // حذف الحقول الحساسة
      delete user.password;
      delete user.otp;
      delete user.otpExpiresAt;
  
      // عدد الاشعارات
      const notificationsCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false
        }
      });
  
      res.json({
        message: "Profile loaded successfully",
  
        user,
  
        meta: {
          unreadNotifications: notificationsCount
        }
  
      });
  
    } catch (err) {
      next(err);
    }
  },

  // ===============================
  // UPDATE PROFILE (LOGGED IN USER)
  // ===============================
  updateProfile: async (req, res, next) => {
    try {
      // نمرر الآي دي، بيانات الـ body، وأيضاً الـ file في حال تم رفع صورة
      const updatedUser = await authService.updateProfile(req.user.id, req.body, req.file);
  
      res.json({
        message: "Profile updated successfully",
        user: updatedUser
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
        orderBy: { createdAt: 'desc' },
        include: {
          Role: true,
          branch: true
        }
      });

      // حذف البيانات الحساسة من القائمة
      const safeUsers = users.map(user => {
        const { password, otp, otpExpiresAt, ...rest } = user;
        return rest;
      });

      res.json({ users: safeUsers });
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
