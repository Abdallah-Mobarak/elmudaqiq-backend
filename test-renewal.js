const renewalService = require("./src/services/renewalNotification.service");

renewalService.checkAndSendRenewalNotifications()
  .then(() => {
    console.log("Renewal check finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Renewal check failed", err);
    process.exit(1);
  });
