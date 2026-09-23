const db = require("../../config/db");

function normalizeTarget({ email, phone }) {
  return email ? email.toLowerCase() : phone;
}

async function findAccountByContactOrUsername(trx, { username, email, phone }) {
  return trx("accounts")
    .where("username", username)
    .orWhere((query) => {
      if (email) query.orWhere("email", email);
      if (phone) query.orWhere("phone", phone);
    })
    .first();
}

async function createAccount(
  trx,
  { username, email, phone, passwordHash, fullName },
) {
  const [id] = await trx("accounts").insert({
    username,
    email: email || null,
    phone: phone || null,
    password_hash: passwordHash,
    full_name: fullName || null,
    status: "pending_verify",
  });

  return trx("accounts").where({ id }).first();
}

async function createOtp(
  trx,
  { accountId, target, channel, codeHash, expiresAt },
) {
  const [id] = await trx("otp_codes").insert({
    account_id: accountId,
    target,
    channel,
    purpose: "register",
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  return trx("otp_codes").where({ id }).first();
}

async function findLatestOtpForUpdate(trx, target) {
  return trx("otp_codes")
    .where({ target, purpose: "register" })
    .whereNull("used_at")
    .where("expires_at", ">", trx.fn.now())
    .orderBy("created_at", "desc")
    .forUpdate()
    .first();
}

async function incrementOtpAttempts(trx, id) {
  await trx("otp_codes").where({ id }).increment("attempts", 1);
}

async function markOtpUsedAndActivateAccount(trx, otp, account) {
  await trx("otp_codes")
    .where({ id: otp.id })
    .update({ used_at: trx.fn.now() });

  const verifiedColumn =
    otp.channel === "email" ? "email_verified_at" : "phone_verified_at";
  await trx("accounts")
    .where({ id: account.id })
    .update({
      status: "active",
      [verifiedColumn]: trx.fn.now(),
    });
}

async function findAccountById(trx, id) {
  return trx("accounts").where({ id }).first();
}

async function findAccountByIdentifier(trx, identifier) {
  return trx("accounts")
    .where("username", identifier)
    .orWhere("email", identifier.toLowerCase())
    .orWhere("phone", identifier)
    .first();
}

async function updateLoginFailure(trx, accountId, failedCount, lockedUntil) {
  await trx("accounts").where({ id: accountId }).update({
    failed_login_count: failedCount,
    locked_until: lockedUntil,
  });
}

async function resetLoginFailure(trx, accountId) {
  await trx("accounts").where({ id: accountId }).update({
    failed_login_count: 0,
    locked_until: null,
    last_login_at: trx.fn.now(),
  });
}

async function createSession(trx, data) {
  const [id] = await trx("user_sessions").insert(data);
  return trx("user_sessions").where({ id }).first();
}

async function findSessionByRefreshHash(trx, refreshTokenHash) {
  return trx("user_sessions")
    .where({ refresh_token_hash: refreshTokenHash })
    .first();
}

async function revokeSession(trx, id, reason = "replaced") {
  await trx("user_sessions").where({ id }).update({
    revoked_at: trx.fn.now(),
    revoked_reason: reason,
  });
}

async function findActiveAccountById(trx, id) {
  return trx("accounts").where({ id, status: "active" }).first();
}

module.exports = {
  db,
  normalizeTarget,
  findAccountByContactOrUsername,
  createAccount,
  createOtp,
  findLatestOtpForUpdate,
  incrementOtpAttempts,
  markOtpUsedAndActivateAccount,
  findAccountById,
  findAccountByIdentifier,
  updateLoginFailure,
  resetLoginFailure,
  createSession,
  findSessionByRefreshHash,
  revokeSession,
  findActiveAccountById,
};
