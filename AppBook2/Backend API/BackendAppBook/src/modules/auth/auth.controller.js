const {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  refreshSchema,
} = require("./auth.schema");
const service = require("./auth.service");

async function register(req, res, next) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await service.register(input);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const input = verifyOtpSchema.parse(req.body);
    const result = await service.verifyOtp(input);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await service.login(input, {
      userAgent: req.get("user-agent"),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await service.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, verifyOtp, login, refresh };
