const { sendOTPEmail } = require("./email.service");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateOTP = require("../utils/generateOTP");

const prisma = new PrismaClient();

module.exports = {
  login: async ({ email, password }) => {

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw { customMessage: "User not found", status: 404 };
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw { customMessage: "Incorrect password", status: 400 };
  }

  const token = jwt.sign(
    { id: user.id, role: user.roleId },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return { message: "Login successful", token, userId: user.id,
  fullName: user.fullName,
  email: user.email };
},

sendOTP: async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Email not found");

  const otp = generateOTP();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5min

  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpiresAt: expires
    } 
  });
  await sendOTPEmail(email, otp);
  return { message: "OTP sent successfully", otp };
},
    verifyOTP: async ({ email, otp }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error("Email not found");
  if (user.otp !== otp) throw new Error("Invalid OTP");
  if (user.otpExpiresAt < new Date()) throw new Error("OTP expired");

  return { message: "OTP verified" };
},
resetPassword: async ({ email, otp, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error("Email not found");
  if (user.otp !== otp) throw new Error("Invalid OTP");
  if (user.otpExpiresAt < new Date()) throw new Error("OTP expired");

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: {
      password: hashed,
      otp: null,
      otpExpiresAt: null
    }
  });

  return { message: "Password updated successfully" };
},


};
