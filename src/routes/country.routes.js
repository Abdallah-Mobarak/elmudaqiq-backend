const router = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const countryController = require("../controllers/country.controller");

// All routes protected + admin only
router.post("/", authMiddleware, adminMiddleware, countryController.create);
// router.get("/", authMiddleware, adminMiddleware, countryController.getAll);
router.get("/", authMiddleware, countryController.getAll);
router.put("/:id", authMiddleware, adminMiddleware, countryController.update);
router.delete("/:id", authMiddleware, adminMiddleware, countryController.delete);

module.exports = router;
