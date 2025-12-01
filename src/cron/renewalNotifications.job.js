const cron = require("node-cron");
const renewalService = require("../services/renewalNotification.service");

// Run every day at 10:00 AM
cron.schedule("0 10 * * *", async () => {
  try {
    await renewalService.checkAndSendRenewalNotifications();
    console.log("Renewal notifications checked successfully");
  } catch (err) {
    console.error("Renewal notification job failed", err);
  }
});
