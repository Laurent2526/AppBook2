const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createAccessToken(account, sessionId) {
  return jwt.sign(
    {
      sub: String(account.id),
      role: account.role,
      sessionId: String(sessionId),
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: `${env.JWT_ACCESS_MINUTES}m` },
  );
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

module.exports = {
  hashToken,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
};
