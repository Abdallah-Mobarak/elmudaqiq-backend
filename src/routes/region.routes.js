const router = require("express").Router();

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const regionController = require("../controllers/region.controller");

router.post("/", authMiddleware, adminMiddleware, regionController.create);
router.get("/", authMiddleware, adminMiddleware, regionController.getAll);
router.put("/:id", authMiddleware, adminMiddleware, regionController.update);
router.delete("/:id", authMiddleware, adminMiddleware, regionController.delete);

module.exports = router;
