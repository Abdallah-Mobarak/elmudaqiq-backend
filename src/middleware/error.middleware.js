// src/middleware/error.middleware.js

// Prisma infrastructure failures (pool exhausted, transaction expired, DB
// unreachable). These used to fall through to the 500 fallback and reached the
// client as a raw multi-line Prisma dump, which the frontend rendered as a
// generic "Something went wrong" / timeout with nothing actionable in it.
const INFRA_ERRORS = {
  // Interactive transaction ran past its timeout, or was rolled back.
  P2028: {
    status: 503,
    message:
      "العملية استغرقت وقتاً أطول من المسموح ولم تكتمل. لم يتم حفظ أي بيانات — برجاء المحاولة مرة أخرى.",
  },
  // Could not get a connection from the pool within pool_timeout.
  P2024: {
    status: 503,
    message:
      "الخادم مشغول حالياً ولم يستطع الاتصال بقاعدة البيانات. برجاء المحاولة بعد قليل.",
  },
  // Write conflict / deadlock.
  P2034: {
    status: 409,
    message:
      "تعارض أثناء الحفظ بسبب عملية أخرى تتم في نفس اللحظة. برجاء إعادة المحاولة.",
  },
  // Value longer than the column allows.
  P2000: {
    status: 400,
    message: "إحدى القيم المُدخلة أطول من الحد المسموح به.",
  },
  P1001: { status: 503, message: "تعذّر الوصول إلى قاعدة البيانات. برجاء المحاولة بعد قليل." },
  P1002: { status: 503, message: "انتهت مهلة الاتصال بقاعدة البيانات. برجاء المحاولة بعد قليل." },
  P1008: { status: 503, message: "انتهت المهلة المحددة للعملية. برجاء المحاولة مرة أخرى." },
  P1017: { status: 503, message: "انقطع الاتصال بقاعدة البيانات. برجاء المحاولة مرة أخرى." },
};

// Node/network level timeouts (SMTP, external calls, sockets).
const NETWORK_CODES = ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE"];

const MULTER_ERRORS = {
  LIMIT_FILE_SIZE: { status: 400, message: "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت." },
  LIMIT_FILE_COUNT: { status: 400, message: "عدد الملفات المرفوعة أكبر من المسموح." },
  LIMIT_UNEXPECTED_FILE: { status: 400, message: "تم إرسال ملف في حقل غير متوقع." },
};

module.exports = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  // Log with request context so a production timeout is traceable.
  console.error(
    `ERROR [${req.method} ${req.originalUrl}]`,
    err && err.code ? `code=${err.code}` : "",
    err
  );

  // Plain thrown objects have no .message, and String({}) is "[object Object]".
  const describe = (e) => {
    if (!e) return String(e);
    if (e.message) return e.message;
    try { return JSON.stringify(e); } catch (_) { return String(e); }
  };

  const send = (status, message, extra) =>
    res.status(status).json({
      message,
      ...(err && err.code ? { code: err.code } : {}),
      ...(isProd ? {} : { debug: describe(err) }),
      ...extra,
    });

  // Prisma record not found
  if (err && err.code === "P2025") {
    return send(404, "Record not found");
  }

  // Prisma unique constraint failed
  if (err && err.code === "P2002") {
    const target = err.meta && err.meta.target ? String(err.meta.target) : "";

    // رسالة مخصصة لخطأ تكرار العقد في نفس التاريخ
    if (target.includes("commercialRegisterNumber_eng")) {
      return send(400, "A contract for this company on this exact engagement date already exists.");
    }

    return send(400, `Duplicate value exists (${target})`);
  }

  // Prisma foreign key constraint / parent not found
  if (err && err.code === "P2003") {
    return send(400, "Invalid foreign key / Parent not found");
  }

  // Prisma cannot delete due to relation (or constraint failed)
  if (err && err.code === "P2004") {
    return send(400, "Cannot delete: related data exists");
  }

  // Prisma infrastructure / timeout errors
  if (err && INFRA_ERRORS[err.code]) {
    const { status, message } = INFRA_ERRORS[err.code];
    return send(status, message);
  }

  // Prisma rejected the query shape - e.g. a NOT NULL column received null
  // because a required upload was missing. These carry no .code, so they used to
  // fall through to the 500 fallback and reached the client as a raw Prisma dump.
  if (err && err.name === "PrismaClientValidationError") {
    const missing = /Argument `(\w+)` must not be null/.exec(err.message || "");
    return send(
      400,
      missing
        ? `حقل مطلوب ناقص: (${missing[1]}). برجاء استكمال كل الحقول والملفات الإلزامية.`
        : "بيانات غير مكتملة أو غير صالحة. برجاء مراجعة الحقول والملفات المطلوبة."
    );
  }

  // Custom errors thrown in services: { customMessage, status }
  if (err && err.customMessage) {
    return send(err.status || 400, err.customMessage);
  }

  // Validation libraries sometimes set .isJoi or similar
  if (err && err.isJoi) {
    return send(400, err.details ? err.details.map((d) => d.message).join(", ") : err.message);
  }

  // Multer upload errors
  if (err && MULTER_ERRORS[err.code]) {
    const { status, message } = MULTER_ERRORS[err.code];
    return send(status, message);
  }

  // Network / socket timeouts
  if (err && NETWORK_CODES.includes(err.code)) {
    return send(504, "انتهت مهلة الاتصال بالخدمة المطلوبة. برجاء المحاولة مرة أخرى.");
  }

  // Default fallback
  return send(500, "حدث خطأ غير متوقع أثناء تنفيذ العملية. برجاء المحاولة أو التواصل مع الدعم الفني.");
};
