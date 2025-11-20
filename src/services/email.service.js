const nodemailer = require("nodemailer");

// Create reusable transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true only for SSL (465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}); 

// Function to send OTP via email
module.exports.sendOTPEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}`,
      html: `<p>Your OTP is:</p><h2>${otp}</h2>`
    });

    return { message: "OTP email sent successfully" };

  } catch (error) {
    console.log("Email Error:", error);
    throw new Error("Failed to send OTP email");
  }
};
