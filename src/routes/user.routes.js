// d:\Test\ERP\el mudaqiq\src\routes\user.routes.js

const router = require("express").Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requirePermission = require("../middleware/requirePermission");
const upload = require("../middleware/uploadSubscriberFiles"); 
const PERMISSIONS = require("../config/permissions");

router.use(authMiddleware);

router.post("/", requirePermission(PERMISSIONS.CREATE_USER), upload.single("profilePhoto"), userController.create);
router.get("/", requirePermission(PERMISSIONS.VIEW_USERS), userController.getAll);
router.get("/:id", requirePermission(PERMISSIONS.VIEW_USERS), userController.getOne);
router.put("/:id", requirePermission(PERMISSIONS.UPDATE_USER), upload.single("profilePhoto"), userController.update);

module.exports = router;
