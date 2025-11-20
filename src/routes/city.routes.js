const router = require("express").Router();

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const cityController = require("../controllers/city.controller");

router.post("/", authMiddleware, adminMiddleware, cityController.create);
router.get("/", authMiddleware, adminMiddleware, cityController.getAll);
router.put("/:id", authMiddleware, adminMiddleware, cityController.update);
router.delete("/:id", authMiddleware, adminMiddleware, cityController.delete);

module.exports = router;
