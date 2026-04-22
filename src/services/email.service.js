const nodemailer = require("nodemailer");

// Create reusable transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true only for SSL (465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS}, 
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000


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

/**
 * Send a generic notification email.
 * Safe helper: logs on error and never throws, so a failed email never breaks
 * the primary business action.
 */
module.exports.sendNotificationEmail = async ({ to, title, message }) => {
  if (!to) return { skipped: true, reason: "no_recipient" };
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>${title}</h2>
          <p>${message}</p>
          <hr>
          <p style="color:#777; font-size: 12px;">هذا البريد تم إرساله تلقائياً من نظام المدقق.</p>
        </div>
      `,
      text: `${title}\n\n${message}`,
    });
    return { sent: true };
  } catch (error) {
    console.error("sendNotificationEmail failed:", error.message);
    return { sent: false, error: error.message };
  }
};

// Function to send Welcome Email to new Subscriber
module.exports.sendSubscriberWelcomeEmail = async ({ to, loginUrl, email, tempPassword }) => {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: to,
      subject: "Welcome to Al-Mudaqiq - Your Account Details",
      html: `
        <h1>Welcome to Al-Mudaqiq</h1>
        <p>Your email has been created successfully.</p>
        <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <br>
        <p>Please login and change your password immediately.</p>
      `
    });
    return { message: "Welcome email sent successfully" };
  } catch (error) {
    console.log("Email Error:", error);
    // Throw error so the caller knows it failed
    throw error;
  }
};
