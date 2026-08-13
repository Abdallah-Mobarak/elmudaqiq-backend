const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const prisma = require("./config/prisma");
const chalk = require("chalk");

dotenv.config();

const app = express();
const errorMiddleware = require("./middleware/error.middleware");

// nginx terminates TLS in front of us, so req.ip / req.protocol are only
// truthful once the first proxy hop is trusted.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

// CORS: restricted to ALLOWED_ORIGINS when it is set, wide open otherwise so an
// unset variable can never take the frontend down. Entries are comma separated
// and may be exact origins or "*.domain" wildcards, e.g.
//   ALLOWED_ORIGINS=https://mudqiq.com,https://*.mudqiq.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    chalk.yellow("WARNING: ALLOWED_ORIGINS is not set - CORS accepts every origin.")
  );
  app.use(cors());
} else {
  const isAllowed = (origin) =>
    allowedOrigins.some((rule) => {
      const star = rule.indexOf("*");
      if (star === -1) return origin === rule;

      // "https://*.mudqiq.com" splits into "https://" + ".mudqiq.com", so
      // https://office.mudqiq.com matches while https://evil-mudqiq.com does
      // not - the dot stays part of the suffix. The length guard stops the
      // wildcard from matching an empty label.
      const prefix = rule.slice(0, star);
      const suffix = rule.slice(star + 1);
      return (
        origin.startsWith(prefix) &&
        origin.endsWith(suffix) &&
        origin.length > prefix.length + suffix.length
      );
    });

  app.use(
    cors({
      // Requests with no Origin (curl, server-to-server, health checks) are not
      // browser cross-origin requests and are left alone.
      origin: (origin, cb) =>
        !origin || isAllowed(origin)
          ? cb(null, true)
          : cb(new Error(`Origin not allowed by CORS: ${origin}`)),
      credentials: true,
    })
  );
}

// Baseline security headers. HSTS is intentionally absent: nginx owns TLS and
// should send Strict-Transport-Security itself.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Uploaded documents. nosniff plus a fixed disposition stops a browser from
// deciding to render one of these inline.
app.use(
  "/uploads",
  express.static("uploads", {
    dotfiles: "deny",
    index: false,
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);


 
   
// Routes
const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);
require("./cron/renewalNotifications.job");

app.use("/countries", require("./routes/country.routes"));
app.use("/cities", require("./routes/city.routes"));
app.use("/regions", require("./routes/region.routes"));
app.use("/engagement-contracts", require("./routes/engagementContract.routes"));
app.use("/contract-review-guides", require("./routes/contractReviewGuide.routes"));
app.use("/api/system-settings", require("./routes/systemSettings.routes"));
app.use("/websites", require("./routes/authorityWebsite.routes"));
 
app.use("/account-guides", require("./routes/accountGuide.routes"));
app.use("/account-guide-templates", require("./routes/accountGuideTemplate.routes"));

app.use("/review-guides", require("./routes/reviewGuide.routes"));
app.use("/review-guide-templates", require("./routes/reviewGuideTemplate.routes"));

app.use("/file-stages", require("./routes/fileStages.routes"));
app.use("/file-stage-templates", require("./routes/fileStageTemplate.routes"));

app.use("/review-objective-stages", require("./routes/reviewObjectiveStage.routes"));
app.use("/review-objective-stage-templates", require("./routes/reviewObjectiveStageTemplate.routes"));

app.use("/review-marks-index", require("./routes/reviewMarkIndex.routes"));
app.use("/review-mark-index-templates", require("./routes/reviewMarkIndexTemplate.routes"));
 
app.use("/subscribers", require("./routes/subscriber.routes"));
app.use("/users", require("./routes/user.routes"));
app.use("/api/branches", require("./routes/branch.routes"));
app.use("/complaints", require("./routes/complaint.routes"));
app.use("/reports", require("./routes/reports.routes"));
app.use("/notifications",  require("./routes/notification.routes"));
app.use("/activity-logs", require("./routes/activityLog.routes"));
app.use("/kpi", require("./routes/kpi.routes"));
app.use("/plans", require("./routes/plan.routes"));
app.use('/contracts', require("./routes/trialBalance.routes"));
app.use('/worksheets', require("./routes/worksheet.routes"));
app.use('/financial-statements', require("./routes/financialStatements.routes"));
  
// Unmatched routes. Without this, Express answers with its built-in HTML page
// ("Cannot POST /x"), and a frontend doing response.json() chokes on it.
app.use((req, res) => {
  res.status(404).json({
    message: "المسار المطلوب غير موجود.",
    path: `${req.method} ${req.originalUrl}`,
  });
});

// Error Handler (ALWAYS LAST)
app.use(errorMiddleware);
 
const PORT = process.env.PORT || 4000;

async function startServer() {
  // Reach the database BEFORE binding the port. Listening first meant a bad
  // DATABASE_URL still opened the port for an instant before process.exit(1),
  // and PM2 restarted it hundreds of times over while nginx served 502s.
  try {
    console.log(chalk.blue("-- Checking database connection --"));

    await prisma.$connect();
    console.log(chalk.bold.green("Database connected Successfully"));

    await prisma.$queryRaw`SELECT 1`;
    console.log(chalk.bold.green("Database synced "));
  } catch (error) {
    console.error(chalk.red("Database connection failed!"));
    console.error(error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(chalk.bgGreen.black(`Server running on PORT ${PORT}`));
  });

  // Drain in-flight requests, then release the MySQL connections, so a deploy
  // does not cut a subscriber's upload in half. Attaching these listeners
  // suppresses Node's default exit-on-signal, so the handler must exit itself.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(chalk.yellow(`\n${signal} received - shutting down`));

    // Do not let a stuck connection block the deploy indefinitely.
    const force = setTimeout(() => process.exit(1), 10000);
    force.unref();

    server.close(async () => {
      await prisma.$disconnect().catch(() => {});
      process.exit(0);
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}
startServer();
