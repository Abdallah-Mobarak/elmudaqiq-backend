const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const accountGuideController = require("../controllers/accountGuide.controller");

// All routes protected + admin only
router.post("/", authMiddleware, adminMiddleware, accountGuideController.create);
router.get("/", authMiddleware, adminMiddleware, accountGuideController.getAll);
router.get("/:id", authMiddleware, adminMiddleware, accountGuideController.getOne);
router.put("/:id", authMiddleware, adminMiddleware, accountGuideController.update);
router.delete("/:id", authMiddleware, adminMiddleware, accountGuideController.delete);

module.exports = router;
