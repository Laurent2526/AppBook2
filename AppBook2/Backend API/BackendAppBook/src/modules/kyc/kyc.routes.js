const router = require("express").Router();
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const controller = require("./kyc.controller");

router.get("/me/kyc", authenticate, controller.get);
router.post("/me/kyc", authenticate, controller.create);
router.post(
  "/admin/kyc/:id/review",
  authenticate,
  authorize("support", "admin", "super_admin"),
  controller.review,
);

module.exports = router;
