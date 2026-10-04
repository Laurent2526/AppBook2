const db = require("../../config/db");

async function setting(key) {
  return db("system_settings").where({ setting_key: key }).first();
}

async function list(accountId) {
  return db("withdraw_requests")
    .select(
      "id",
      "code",
      "bank_snapshot",
      "amount",
      "fee",
      "actual_amount",
      "currency",
      "status",
      "reject_reason",
      "reviewed_at",
      "completed_at",
      "transfer_ref",
      "created_at",
      "updated_at",
    )
    .where({ account_id: accountId })
    .orderBy("created_at", "desc");
}

async function findWalletForUpdate(trx, accountId) {
  return trx("wallets").where({ account_id: accountId }).forUpdate().first();
}

async function findBankForUpdate(trx, accountId, bankAccountId) {
  return trx("bank_accounts")
    .where({ id: bankAccountId, account_id: accountId })
    .whereNull("deleted_at")
    .forUpdate()
    .first();
}

async function hasPending(trx, accountId) {
  return trx("withdraw_requests")
    .where({ account_id: accountId, status: "pending" })
    .forUpdate()
    .first();
}

async function createTransaction(trx, data) {
  const [id] = await trx("transactions").insert(data);
  return id;
}

async function createRequest(trx, data) {
  const [id] = await trx("withdraw_requests").insert(data);
  return trx("withdraw_requests").where({ id }).first();
}

async function addLedger(trx, data) {
  await trx("wallet_entries").insert(data);
}

async function listAdmin() {
  return db("withdraw_requests")
    .leftJoin("accounts", "accounts.id", "withdraw_requests.account_id")
    .select(
      "withdraw_requests.*",
      "accounts.username as account_username",
      "accounts.full_name as account_full_name",
      "accounts.email as account_email",
    )
    .orderBy([
      { column: "withdraw_requests.status", order: "asc" },
      { column: "withdraw_requests.created_at", order: "asc" },
    ]);
}

async function findRequestForUpdate(trx, id) {
  return trx("withdraw_requests").where({ id }).forUpdate().first();
}

async function updateRequest(trx, id, data) {
  await trx("withdraw_requests").where({ id }).update(data);
}

async function findWalletByAccountForUpdate(trx, accountId) {
  return findWalletForUpdate(trx, accountId);
}

async function updateTransaction(trx, id, data) {
  await trx("transactions").where({ id }).update(data);
}

async function audit(trx, data) {
  await trx("audit_logs").insert(data);
}

module.exports = {
  db,
  setting,
  list,
  findWalletForUpdate,
  findBankForUpdate,
  hasPending,
  createTransaction,
  createRequest,
  addLedger,
  listAdmin,
  findRequestForUpdate,
  updateRequest,
  findWalletByAccountForUpdate,
  updateTransaction,
  audit,
};
