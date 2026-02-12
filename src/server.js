const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const chalk = require("chalk");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const errorMiddleware = require("./middleware/error.middleware");
const resolveTenant = require("./middleware/resolveTenant.middleware");

app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cors());

app.use("/uploads", express.static("uploads"));


 
   
// Routes
const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);
require("./cron/renewalNotifications.job");
app.use("/subscriber-auth", resolveTenant, authRoutes);




app.use("/countries", require("./routes/country.routes"));
app.use("/cities", require("./routes/city.routes"));
app.use("/regions", require("./routes/region.routes"));
app.use("/api/system-settings", require("./routes/systemSettings.routes"));
app.use("/websites", require("./routes/authorityWebsite.routes"));
app.use("/account-guides", require("./routes/accountGuide.routes"));
app.use("/review-guides", require("./routes/reviewGuide.routes"));
app.use("/file-stages", require("./routes/fileStages.routes"));
app.use("/review-objective-stages", require("./routes/reviewObjectiveStage.routes"));
app.use("/review-marks-index", require("./routes/reviewMarkIndex.routes"));
app.use("/subscribers", require("./routes/subscriber.routes"));
app.use("/complaints", require("./routes/complaint.routes"));
app.use("/reports", require("./routes/reports.routes"));
app.use("/notifications",  require("./routes/notification.routes"));
app.use("/activity-logs", require("./routes/activityLog.routes"));
app.use("/kpi", require("./routes/kpi.routes"));
app.use("/plans", require("./routes/plan.routes"));


// Error Handler (ALWAYS LAST)
app.use(errorMiddleware);
 
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(chalk.bgGreen.black(`Server running on PORT ${PORT}`));
    });

    console.log(chalk.blue("-- Checking database connection --"));

    await prisma.$connect();
    console.log(chalk.bold.green("Database connected Successfully"));

    await prisma.$queryRaw`SELECT 1`;
    console.log(chalk.bold.green("Database synced "));


  } catch (error) {
    console.error(chalk.red("Database connection failed!"));
    console.error(error);
    process.exit(1); 
  }
}
startServer();

