const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const controller = require("./auth.controller");
const env = require("../../config/env");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => env.NODE_ENV === "test",
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post("/register", authLimiter, controller.register);
router.post("/verify-otp", authLimiter, controller.verifyOtp);
router.post("/login", authLimiter, controller.login);
router.post("/refresh", authLimiter, controller.refresh);

module.exports = router;
