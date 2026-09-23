const db = require("../../config/db");

async function setting(key) {
  return db("system_settings").where({ setting_key: key }).first();
}

async function listByAccount(accountId) {
  return db("topup_orders")
    .select(
      "id",
      "code",
      "account_id",
      "transaction_id",
      "amount",
      "currency",
      "payment_method",
      "status",
      "gateway_txn_id",
      "gateway_response",
      "paid_at",
      "expires_at",
      "created_at",
      "updated_at",
    )
    .where({ account_id: accountId })
    .orderBy("created_at", "desc");
}

async function findById(id) {
  return db("topup_orders").where({ id }).first();
}

async function findByCode(code) {
  return db("topup_orders").where({ code }).first();
}

async function findByGateway(paymentMethod, gatewayTxnId) {
  return db("topup_orders")
    .where({ payment_method: paymentMethod, gateway_txn_id: gatewayTxnId })
    .first();
}

async function findOrderForUpdate(trx, id) {
  return trx("topup_orders").where({ id }).forUpdate().first();
}

async function findWalletForUpdate(trx, accountId) {
  return trx("wallets").where({ account_id: accountId }).forUpdate().first();
}

async function createOrder(trx, data) {
  const [id] = await trx("topup_orders").insert(data);
  return trx("topup_orders").where({ id }).first();
}

async function updateOrder(trx, id, data) {
  await trx("topup_orders").where({ id }).update(data);
  return trx("topup_orders").where({ id }).first();
}

async function createTransaction(trx, data) {
  const [id] = await trx("transactions").insert(data);
  return id;
}

async function addLedger(trx, data) {
  await trx("wallet_entries").insert(data);
}

module.exports = {
  db,
  setting,
  listByAccount,
  findById,
  findByCode,
  findByGateway,
  findOrderForUpdate,
  findWalletForUpdate,
  createOrder,
  updateOrder,
  createTransaction,
  addLedger,
};
