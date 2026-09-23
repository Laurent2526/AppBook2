const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const controller = require("./withdraw.controller");

router.post("/me/withdrawals", authenticate, controller.create);
router.get("/me/withdrawals", authenticate, controller.list);
router.use(
  "/admin/withdrawals",
  authenticate,
  authorize("support", "admin", "super_admin"),
);
router.get("/admin/withdrawals", controller.listAdmin);
router.post("/admin/withdrawals/:id/approve", controller.approve);
router.post("/admin/withdrawals/:id/reject", controller.reject);
router.post("/admin/withdrawals/:id/complete", controller.complete);

module.exports = router;
