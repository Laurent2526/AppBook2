const argon2 = require("argon2");
const { randomInt } = require("crypto");
const ApiError = require("../../utils/apiError");
const env = require("../../config/env");
const {
  createAccessToken,
  createRefreshToken,
  hashToken,
} = require("../../utils/tokens");
const repository = require("./auth.repository");

function publicAccount(account) {
  if (!account) return null;
  const { password_hash, ...safeAccount } = account;
  return safeAccount;
}

function getExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  return expiresAt;
}

function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;
}

function getRefreshExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_DAYS);
  return expiresAt;
}

async function register(input) {
  const email = input.email?.toLowerCase();
  const phone = input.phone;
  const target = repository.normalizeTarget({ email, phone });
  const code = String(randomInt(100000, 1000000));
  const passwordHash = await argon2.hash(input.password);

  try {
    const result = await repository.db.transaction(async (trx) => {
      const existing = await repository.findAccountByContactOrUsername(trx, {
        username: input.username,
        email,
        phone,
      });

      if (existing) {
        throw new ApiError(
          409,
          "ACCOUNT_ALREADY_EXISTS",
          "Username hoặc thông tin liên hệ đã tồn tại",
        );
      }

      const account = await repository.createAccount(trx, {
        username: input.username,
        email,
        phone,
        passwordHash,
        fullName: input.fullName,
      });

      await repository.createOtp(trx, {
        accountId: account.id,
        target,
        channel: input.channel,
        codeHash: await argon2.hash(code),
        expiresAt: getExpiryDate(),
      });

      return { account, target };
    });

    return {
      account: publicAccount(result.account),
      target: result.target,
      ...(env.NODE_ENV !== "production" ? { debugOtp: code } : {}),
    };
  } catch (error) {
    if (isDuplicateError(error)) {
      throw new ApiError(
        409,
        "ACCOUNT_ALREADY_EXISTS",
        "Username hoặc thông tin liên hệ đã tồn tại",
      );
    }
    throw error;
  }
}

async function verifyOtp({ target, code }) {
  const normalizedTarget = target.includes("@") ? target.toLowerCase() : target;

  return repository.db.transaction(async (trx) => {
    const otp = await repository.findLatestOtpForUpdate(trx, normalizedTarget);
    if (!otp) {
      throw new ApiError(
        400,
        "OTP_EXPIRED_OR_NOT_FOUND",
        "OTP không tồn tại hoặc đã hết hạn",
      );
    }

    if (otp.attempts >= otp.max_attempts) {
      throw new ApiError(
        429,
        "OTP_ATTEMPTS_EXCEEDED",
        "OTP đã vượt quá số lần thử",
      );
    }

    const valid = await argon2.verify(otp.code_hash, code);
    if (!valid) {
      await repository.incrementOtpAttempts(trx, otp.id);
      throw new ApiError(400, "INVALID_OTP", "OTP không chính xác");
    }

    const account = await repository.findAccountById(trx, otp.account_id);
    if (!account || account.status === "deleted") {
      throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản");
    }

    await repository.markOtpUsedAndActivateAccount(trx, otp, account);
    return { account: publicAccount({ ...account, status: "active" }) };
  });
}

async function login(input, requestMeta = {}) {
  const identifier = input.identifier.includes("@")
    ? input.identifier.toLowerCase()
    : input.identifier;

  return repository.db.transaction(async (trx) => {
    const account = await repository.findAccountByIdentifier(trx, identifier);
    if (!account) {
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Thông tin đăng nhập không chính xác",
      );
    }

    if (account.status === "locked" || account.status === "deleted") {
      throw new ApiError(
        403,
        "ACCOUNT_UNAVAILABLE",
        "Tài khoản không thể đăng nhập",
      );
    }
    if (account.status !== "active") {
      throw new ApiError(
        403,
        "ACCOUNT_NOT_VERIFIED",
        "Tài khoản chưa được xác thực",
      );
    }
    if (account.locked_until && new Date(account.locked_until) > new Date()) {
      throw new ApiError(
        429,
        "LOGIN_TEMPORARILY_LOCKED",
        "Tài khoản đang bị tạm khóa đăng nhập",
      );
    }

    const validPassword = await argon2.verify(
      account.password_hash,
      input.password,
    );
    if (!validPassword) {
      const failedCount = Number(account.failed_login_count || 0) + 1;
      const lockedUntil =
        failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await repository.updateLoginFailure(
        trx,
        account.id,
        failedCount,
        lockedUntil,
      );
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Thông tin đăng nhập không chính xác",
      );
    }

    await repository.resetLoginFailure(trx, account.id);
    const refreshToken = createRefreshToken();
    const session = await repository.createSession(trx, {
      account_id: account.id,
      refresh_token_hash: hashToken(refreshToken),
      device_id: input.deviceId || null,
      device_name: input.deviceName || null,
      platform: input.platform,
      app_version: input.appVersion || null,
      ip_address: requestMeta.ip || null,
      user_agent: requestMeta.userAgent || null,
      expires_at: getRefreshExpiryDate(),
      last_active_at: trx.fn.now(),
    });

    return {
      account: publicAccount(account),
      accessToken: createAccessToken(account, session.id),
      refreshToken,
      sessionId: session.id,
    };
  });
}

async function refresh(refreshToken) {
  return repository.db.transaction(async (trx) => {
    const oldSession = await repository.findSessionByRefreshHash(
      trx,
      hashToken(refreshToken),
    );
    if (
      !oldSession ||
      oldSession.revoked_at ||
      new Date(oldSession.expires_at) <= new Date()
    ) {
      throw new ApiError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token không hợp lệ hoặc đã hết hạn",
      );
    }

    const account = await repository.findActiveAccountById(
      trx,
      oldSession.account_id,
    );
    if (!account) {
      throw new ApiError(
        401,
        "ACCOUNT_UNAVAILABLE",
        "Tài khoản không thể đăng nhập",
      );
    }

    const nextRefreshToken = createRefreshToken();
    await repository.revokeSession(trx, oldSession.id, "replaced");
    const session = await repository.createSession(trx, {
      account_id: account.id,
      refresh_token_hash: hashToken(nextRefreshToken),
      device_id: oldSession.device_id,
      device_name: oldSession.device_name,
      platform: oldSession.platform,
      app_version: oldSession.app_version,
      ip_address: oldSession.ip_address,
      user_agent: oldSession.user_agent,
      expires_at: getRefreshExpiryDate(),
      last_active_at: trx.fn.now(),
    });

    return {
      accessToken: createAccessToken(account, session.id),
      refreshToken: nextRefreshToken,
      sessionId: session.id,
    };
  });
}

module.exports = { register, verifyOtp, login, refresh };
