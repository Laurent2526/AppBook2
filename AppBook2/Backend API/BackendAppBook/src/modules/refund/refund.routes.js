const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const controller = require("./refund.controller");

router.post("/me/refunds", authenticate, controller.create);
router.get("/me/refunds", authenticate, controller.listMine);

router.use(
  "/admin/refunds",
  authenticate,
  authorize("support", "admin", "super_admin"),
);
router.get("/admin/refunds", controller.listAdmin);
router.post("/admin/refunds/:id/approve", controller.approve);
router.post("/admin/refunds/:id/reject", controller.reject);

module.exports = router;
