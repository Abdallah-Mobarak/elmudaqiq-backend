const { sendOTPEmail } = require("./email.service");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateOTP = require("../utils/generateOTP");

const prisma = new PrismaClient();

module.exports = {

  // ===============================
  // LOGIN (ADMIN + SUBSCRIBER)
  // ===============================
  login: async ({ email, password, subscriberId = null }) => {

    //  نحدد هو Admin ولا Subscriber
    const whereClause = subscriberId
      ? { email, subscriberId }
      : { email, subscriberId: null };

    const user = await prisma.user.findFirst({
      where: whereClause,
      include: {
        Role: true
      }
    });

    if (!user) {
      throw { customMessage: "Invalid email or password", status: 401 };
    }

    // 2تحقق من الحالة
    if (user.status !== "active") {
      throw { customMessage: "User is inactive", status: 403 };
    }

    // 3 تحقق من الباسورد
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw { customMessage: "Invalid email or password", status: 401 };
    }

    // 4 Generate Token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.Role.name,
        subscriberId: user.subscriberId,
        mustChangePassword: user.mustChangePassword

      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5 Response
    return {
      message: "Login successful",
      token,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.Role.name,
        subscriberId: user.subscriberId,
      }
    };
  },

  // ===============================
  // SEND OTP
  // ===============================
  sendOTP: async ({ email, subscriberId = null }) => {

    const user = await prisma.user.findFirst({
      where: {
        email,
        subscriberId
      }
    });

    if (!user) {
      throw { customMessage: "Unregistered email", status: 404 };
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiresAt: expires
      }
    });

    await sendOTPEmail(email, otp);

    return { message: "OTP sent successfully" };
  },

  // ===============================
  // VERIFY OTP
  // ===============================
  verifyOTP: async ({ email, otp, subscriberId = null }) => {

    const user = await prisma.user.findFirst({
      where: {
        email,
        subscriberId
      }
    });

    if (!user) throw new Error("Invalid OTP");
    if (user.otp !== otp) throw new Error("Invalid OTP");
    if (user.otpExpiresAt < new Date()) throw new Error("OTP expired");

    return { message: "OTP verified" };
  },

  // ===============================
  // RESET PASSWORD
  // ===============================
  resetPassword: async ({ email, otp, newPassword, subscriberId = null }) => {

    const user = await prisma.user.findFirst({
      where: {
        email,
        subscriberId
      }
    });

    if (!user) throw new Error("Invalid OTP");
    if (user.otp !== otp) throw new Error("Invalid OTP");
    if (user.otpExpiresAt < new Date()) throw new Error("OTP expired");

    // Validate Password Strength (Requirement 2.1.2)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw { customMessage: "Password must be at least 8 characters and include letters, numbers, and symbols", status: 400 };
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        otp: null,
        otpExpiresAt: null,
        mustChangePassword: false
      }
    });

    return { message: "Password updated successfully" };
  },

  // ===============================
  // CHANGE PASSWORD (AUTHENTICATED)
  // ===============================
  changePassword: async ({ userId, oldPassword, newPassword }) => {

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
  
    if (!user) {
      throw { customMessage: "User not found", status: 404 };
    }
  
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      throw { customMessage: "Old password is incorrect", status: 400 };
    }
  
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw {
        customMessage:
          "Password must be at least 8 characters and include letters, numbers, and symbols",
        status: 400
      };
    }
  
    const hashed = await bcrypt.hash(newPassword, 10);
  
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        mustChangePassword: false
      }
    });
  
    return { message: "Password changed successfully" };
  }
};
