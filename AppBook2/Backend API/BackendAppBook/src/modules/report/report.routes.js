const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const controller = require("./report.controller");

router.post("/reports", authenticate, controller.create);
router.use(
  "/admin/reports",
  authenticate,
  authorize("support", "admin", "super_admin"),
);
router.get("/admin/reports", controller.list);
router.post("/admin/reports/:id/resolve", controller.resolve);
router.post("/admin/reports/:id/dismiss", controller.dismiss);

module.exports = router;
