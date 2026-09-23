const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const controller = require("./moderation.controller");

router.use(authenticate, authorize("support", "admin", "super_admin"));
router.get("/", controller.list);
router.post("/:id/approve", controller.approve);
router.post("/:id/reject", controller.reject);

module.exports = router;
