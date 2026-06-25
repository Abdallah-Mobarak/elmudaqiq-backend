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

/* ------------------------------------------------------------------ *
 * Branded, responsive email layout.
 * All styling is inline (email clients strip <style>), built around a
 * 600px centered card that renders well on desktop and mobile.
 * ------------------------------------------------------------------ */
const BRAND = {
  name: "المدقق",
  nameEn: "Al-Mudaqiq",
  primary: "#0f766e",      // teal-700
  primaryDark: "#134e4a",  // teal-900
  accent: "#14b8a6",       // teal-500
  bg: "#eef2f5",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
};

/**
 * Wrap inner content in the shared branded shell.
 * @param {object} o
 * @param {string} o.heading  - title shown inside the card
 * @param {string} o.body     - inner HTML for the card body
 * @param {"rtl"|"ltr"} [o.dir]
 * @param {string} [o.preview] - hidden preheader text shown in inbox list
 */
function baseTemplate({ heading, body, dir = "rtl", preview = "" }) {
  const align = dir === "rtl" ? "right" : "left";
  const year = "2026";
  return `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bg}; -webkit-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg}; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(15,23,42,0.08); font-family:'Segoe UI', Tahoma, Arial, sans-serif;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); padding:32px 32px; text-align:center;">
              <div style="font-size:26px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">${BRAND.name}</div>
              <div style="font-size:12px; color:#a7f3d0; letter-spacing:3px; text-transform:uppercase; margin-top:4px;">${BRAND.nameEn}</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td dir="${dir}" style="padding:36px 32px; text-align:${align}; color:${BRAND.text};">
              <h1 style="margin:0 0 16px; font-size:22px; font-weight:700; color:${BRAND.primaryDark};">${heading}</h1>
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; padding:24px 32px; text-align:center; border-top:1px solid ${BRAND.border};">
              <p style="margin:0; font-size:12px; color:${BRAND.muted}; line-height:1.7;">
                هذا البريد تم إرساله تلقائياً من نظام ${BRAND.name} — برجاء عدم الرد عليه.
              </p>
              <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">
                &copy; ${year} ${BRAND.nameEn}. جميع الحقوق محفوظة.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Render a primary call-to-action button. */
function button(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto;">
    <tr><td style="border-radius:10px; background:linear-gradient(135deg, ${BRAND.accent} 0%, ${BRAND.primary} 100%);">
      <a href="${url}" target="_blank" style="display:inline-block; padding:13px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">${label}</a>
    </td></tr>
  </table>`;
}

const P = `margin:0 0 14px; font-size:15px; line-height:1.8; color:${BRAND.text};`;

// Function to send OTP via email
module.exports.sendOTPEmail = async (email, otp) => {
  try {
    const body = `
      <p style="${P}">استخدم رمز التحقق التالي لإتمام العملية. الرمز صالح لفترة محدودة فلا تشاركه مع أحد.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
        <tr><td style="background-color:#f0fdfa; border:1px dashed ${BRAND.accent}; border-radius:12px; padding:18px 36px; text-align:center;">
          <div style="font-size:34px; font-weight:700; letter-spacing:10px; color:${BRAND.primaryDark}; font-family:'Courier New', monospace;">${otp}</div>
        </td></tr>
      </table>
      <p style="margin:0; font-size:13px; color:${BRAND.muted}; line-height:1.7;">إذا لم تطلب هذا الرمز يمكنك تجاهل هذه الرسالة بأمان.</p>
    `;
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: `رمز التحقق الخاص بك: ${otp}`,
      text: `رمز التحقق الخاص بك هو: ${otp}`,
      html: baseTemplate({ heading: "رمز التحقق", body, preview: `رمز التحقق: ${otp}` }),
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
    const body = `<p style="${P}">${message}</p>`;
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject: title,
      html: baseTemplate({ heading: title, body, preview: title }),
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
    const row = (label, value, mono = false) => `
      <tr>
        <td style="padding:12px 16px; font-size:13px; color:${BRAND.muted}; border-bottom:1px solid ${BRAND.border};">${label}</td>
        <td style="padding:12px 16px; font-size:14px; font-weight:600; color:${BRAND.text}; border-bottom:1px solid ${BRAND.border}; ${mono ? "font-family:'Courier New', monospace; letter-spacing:1px;" : ""}">${value}</td>
      </tr>`;
    const body = `
      <p style="${P}">تم إنشاء حسابك بنجاح في نظام ${BRAND.name}. فيما يلي بيانات الدخول الخاصة بك:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px; background-color:#f9fafb; border:1px solid ${BRAND.border}; border-radius:12px; overflow:hidden;">
        ${row("البريد الإلكتروني", email)}
        ${row("كلمة المرور المؤقتة", tempPassword, true)}
      </table>
      <div style="text-align:center;">${button("تسجيل الدخول الآن", loginUrl)}</div>
      <p style="margin:20px 0 0; font-size:13px; color:${BRAND.muted}; line-height:1.7;">🔒 لأسباب أمنية، يُرجى تسجيل الدخول وتغيير كلمة المرور المؤقتة فور دخولك.</p>
    `;
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: to,
      subject: `مرحباً بك في ${BRAND.name} — بيانات حسابك`,
      html: baseTemplate({ heading: `مرحباً بك في ${BRAND.name} 👋`, body, preview: "تم إنشاء حسابك بنجاح — بيانات الدخول بالداخل" }),
      text: `مرحباً بك في ${BRAND.name}\n\nالبريد الإلكتروني: ${email}\nكلمة المرور المؤقتة: ${tempPassword}\nرابط الدخول: ${loginUrl}\n\nيُرجى تسجيل الدخول وتغيير كلمة المرور فوراً.`,
    });
    return { message: "Welcome email sent successfully" };
  } catch (error) {
    console.log("Email Error:", error);
    // Throw error so the caller knows it failed
    throw error;
  }
};
