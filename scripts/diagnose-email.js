/**
 * SMTP diagnostics.
 *
 *   node scripts/diagnose-email.js                 -> inspect config + verify connection (sends nothing)
 *   node scripts/diagnose-email.js you@gmail.com   -> also send a real welcome email through the app's own code path
 *
 * Run it on the server so it reads the same .env PM2 uses.
 */
require("dotenv").config();
const nodemailer = require("nodemailer");

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, BASE_DOMAIN, NODE_ENV } = process.env;

const mask = (v) => (!v ? "(غير موجود)" : v.length <= 4 ? "****" : v.slice(0, 2) + "*".repeat(v.length - 4) + v.slice(-2));
const line = (k, v) => console.log(`  ${k.padEnd(14)} ${v}`);

console.log("\n=== الإعدادات الحالية ===");
line("NODE_ENV", NODE_ENV || "(غير موجود)");
line("BASE_DOMAIN", BASE_DOMAIN || "(غير موجود)");
line("SMTP_HOST", SMTP_HOST || "(غير موجود)");
line("SMTP_PORT", SMTP_PORT || "(غير موجود)");
line("SMTP_USER", SMTP_USER || "(غير موجود)");
line("SMTP_PASS", mask(SMTP_PASS));
line("FROM_EMAIL", FROM_EMAIL || "(غير موجود)");
line("secure", String(Number(SMTP_PORT) === 465));

// --- Static checks: things that are wrong before we even connect ---
const problems = [];

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  problems.push("متغيرات SMTP ناقصة — الإرسال مستحيل.");
}

if (SMTP_HOST && SMTP_HOST.includes("mailtrap")) {
  problems.push(
    "SMTP_HOST بيشاور على Mailtrap. الـ sandbox بيمسك الإيميلات في صندوق تجريبي\n" +
    "     ومابيوصلهاش لأي مستقبِل حقيقي أبداً. الاتصال هينجح والكود هيقول SENT،\n" +
    "     لكن العميل عمره ما هيستلم حاجة. ده سبب 'الإيميلات مش بتوصل'."
  );
}

if (Number(SMTP_PORT) === 25) {
  problems.push("بورت 25 مقفول للخروج على DigitalOcean. استخدم 587 أو 465.");
}

// Gmail refuses a From that is not the authenticated user or a verified alias.
if (SMTP_HOST && SMTP_HOST.includes("gmail") && FROM_EMAIL && SMTP_USER) {
  const fromAddr = (FROM_EMAIL.match(/[^<\s"]+@[^>\s"]+/) || [FROM_EMAIL])[0];
  if (fromAddr.toLowerCase() !== SMTP_USER.toLowerCase()) {
    problems.push(
      `FROM_EMAIL (${fromAddr}) مختلف عن SMTP_USER (${SMTP_USER}).\n` +
      "     Gmail بيرفض أي From مش هو الحساب المسجَّل دخول بيه أو alias متحقق منه\n" +
      "     في 'Send mail as'. النتيجة: رفض 553 أو إعادة كتابة العنوان."
    );
  }
}

if (problems.length) {
  console.log("\n=== مشاكل مكتشفة ===");
  problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
} else {
  console.log("\n  لا توجد مشاكل واضحة في الإعدادات.");
}

// --- Live check ---
(async () => {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  console.log("\n=== اختبار الاتصال والمصادقة ===");
  try {
    await transporter.verify();
    console.log("  ✅ الاتصال والـ authentication نجحوا.");
  } catch (err) {
    console.log(`  ❌ فشل: ${err.message}`);
    if (err.code) console.log(`     code: ${err.code}`);
    if (err.responseCode) console.log(`     responseCode: ${err.responseCode}`);
    console.log("\n  التفسير:");
    if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
      console.log("     البورت متحجوب أو الهوست غلط. جرّب: telnet " + SMTP_HOST + " " + SMTP_PORT);
    } else if (err.code === "EAUTH" || err.responseCode === 535) {
      console.log("     بيانات الدخول مرفوضة. لو Gmail: لازم App Password (مش باسورد الحساب)");
      console.log("     و 2-Step Verification مفعّلة على الحساب.");
    } else if (err.code === "ECONNREFUSED") {
      console.log("     السيرفر رفض الاتصال — راجع SMTP_HOST و SMTP_PORT.");
    }
    process.exit(1);
  }

  const recipient = process.argv[2];
  if (!recipient) {
    console.log("\n  (مبعتش أي إيميل. لإرسال اختبار حقيقي: node scripts/diagnose-email.js your@email.com)");
    process.exit(0);
  }

  // Go through the app's real sender so the template and env-derived login URL
  // are exercised exactly as a new subscriber would receive them.
  console.log(`\n=== إرسال إيميل ترحيب حقيقي إلى ${recipient} ===`);
  const { sendSubscriberWelcomeEmail } = require("../src/services/email.service");
  const protocol = NODE_ENV === "production" ? "https" : "http";
  const loginUrl = `${protocol}://test-office.${BASE_DOMAIN || "mudqiq.com"}`;

  try {
    await sendSubscriberWelcomeEmail({
      to: recipient,
      loginUrl,
      email: recipient,
      tempPassword: "TestPass123",
    });
    console.log("  ✅ الإرسال تم بدون أخطاء.");
    console.log(`     loginUrl المستخدم: ${loginUrl}`);
    if (SMTP_HOST && SMTP_HOST.includes("mailtrap")) {
      console.log("\n  ⚠️  بس ده راح لصندوق Mailtrap، مش لبريد المستقبِل الحقيقي.");
      console.log("     شوفه على: https://mailtrap.io/inboxes");
    } else {
      console.log("\n  اتأكد من الوصول — وشوف مجلد الـ Spam كمان.");
    }
  } catch (err) {
    console.log(`  ❌ فشل الإرسال: ${err.message}`);
    if (err.responseCode) console.log(`     responseCode: ${err.responseCode}`);
    process.exit(1);
  }
  process.exit(0);
})();
