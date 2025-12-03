const router = require("express").Router();
const planController = require("../controllers/plan.controller");

router.post("/", planController.create);
router.get("/", planController.getAll);
router.get("/:id", planController.getById);
router.put("/:id", planController.update);
router.delete("/:id", planController.remove);

module.exports = router;
