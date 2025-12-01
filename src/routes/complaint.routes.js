const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const complaintController = require("../controllers/complaint.controller");

//  Create Complaint
router.post("/", complaintController.create);

//  View All Complaints (Admin)
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  complaintController.getAll
);

//  Respond To Complaint (Admin)
router.patch(
  "/:id/respond",
  authMiddleware,
  adminMiddleware,
  complaintController.respond
);

module.exports = router;
