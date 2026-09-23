const ApiError = require("../utils/apiError");
const { verifyAccessToken } = require("../utils/tokens");
const db = require("../config/db");

module.exports = async (req, res, next) => {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "AUTH_REQUIRED", "Yêu cầu access token"));
  }

  try {
    const auth = verifyAccessToken(header.slice(7));
    const session = await db("user_sessions as sessions")
      .join("accounts", "accounts.id", "sessions.account_id")
      .select(
        "accounts.id",
        "accounts.username",
        "accounts.email",
        "accounts.phone",
        "accounts.role",
        "accounts.is_author",
        "sessions.id as sessionId",
      )
      .where("sessions.id", auth.sessionId)
      .where("sessions.account_id", auth.sub)
      .whereNull("sessions.revoked_at")
      .where("sessions.expires_at", ">", db.fn.now())
      .where("accounts.status", "active")
      .first();

    if (!session) {
      return next(
        new ApiError(
          401,
          "SESSION_REVOKED",
          "Phiên đăng nhập không còn hợp lệ",
        ),
      );
    }

    req.auth = auth;
    req.account = session;
    next();
  } catch (error) {
    next(
      new ApiError(
        401,
        "INVALID_ACCESS_TOKEN",
        "Access token không hợp lệ hoặc đã hết hạn",
      ),
    );
  }
};
