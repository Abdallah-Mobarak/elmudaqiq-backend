const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authService = require("../services/auth.service");



module.exports = {
  login: async (req, res,next) => {
    try {
      const data = await authService.login(req.body);
      res.json(data);
    } catch (err) {
      next(err)
    }
  },

  sendOTP: async (req, res,next) => {
  try {
    const data = await authService.sendOTP(req.body.email);
    res.json(data);
  } catch (err) {
    next(err);
  }
    },

  verifyOTP: async (req, res,next) => {
  try {
    const data = await authService.verifyOTP(req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
    },

  resetPassword: async (req, res,next) => {
  try {
    const data = await authService.resetPassword(req.body);
    res.json(data);
  } catch (err) {
   next(err);
  }
    },


profile: async (req, res,next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          roleId: true,
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

getAllUsers: async (req, res,next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        createdAt: true
      }
    });

    res.json({ users });

  } catch (err) {
    next(err);
  }

  }
};
 