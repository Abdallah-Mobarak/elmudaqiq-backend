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

    // 1️⃣ نحدد هو Admin ولا Subscriber
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

    // 2️⃣ تحقق من الحالة
    if (user.status !== "active") {
      throw { customMessage: "User is inactive", status: 403 };
    }

    // 3️⃣ تحقق من الباسورد
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw { customMessage: "Invalid email or password", status: 401 };
    }

    // 4️⃣ Generate Token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.Role.name,
        subscriberId: user.subscriberId
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5️⃣ Response
    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.Role.name,
        subscriberId: user.subscriberId
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
        otpExpiresAt: null
      }
    });

    return { message: "Password updated successfully" };
  }
};
