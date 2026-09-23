const db = require("../../config/db");

async function findPurchaseForAccountAndChapter(accountId, chapterId) {
  return db("purchases")
    .where({ account_id: accountId, chapter_id: chapterId, is_revoked: 0 })
    .first();
}

async function findTransactionForBuyer(trx, accountId, transactionId) {
  return trx("transactions")
    .where({
      id: transactionId,
      buyer_id: accountId,
      transaction_type: "purchase",
    })
    .whereIn("status", ["success", "pending"])
    .first();
}

async function findRefundByTransaction(accountId, transactionId) {
  return db("refund_requests")
    .where({ account_id: accountId, transaction_id: transactionId })
    .whereIn("status", ["pending", "approved", "completed", "rejected"])
    .first();
}

async function createRefundRequest(trx, data) {
  const [id] = await trx("refund_requests").insert(data);
  return trx("refund_requests").where({ id }).first();
}

async function listByAccount(accountId) {
  return db("refund_requests")
    .where({ account_id: accountId })
    .orderBy("created_at", "desc");
}

async function listAll() {
  return db("refund_requests").orderBy("created_at", "asc");
}

async function findRefundForUpdate(trx, id) {
  return trx("refund_requests").where({ id }).forUpdate().first();
}

async function findTransactionForUpdate(trx, id) {
  return trx("transactions").where({ id }).forUpdate().first();
}

async function findWalletForUpdate(trx, accountId) {
  return trx("wallets").where({ account_id: accountId }).forUpdate().first();
}

async function updateRefund(trx, id, data) {
  await trx("refund_requests").where({ id }).update(data);
}

async function updateTransaction(trx, id, data) {
  await trx("transactions").where({ id }).update(data);
}

async function updatePurchase(trx, accountId, chapterId, data) {
  await trx("purchases")
    .where({ account_id: accountId, chapter_id: chapterId })
    .update(data);
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
  findPurchaseForAccountAndChapter,
  findTransactionForBuyer,
  findRefundByTransaction,
  createRefundRequest,
  listByAccount,
  listAll,
  findRefundForUpdate,
  findTransactionForUpdate,
  findWalletForUpdate,
  updateRefund,
  updateTransaction,
  updatePurchase,
  createTransaction,
  addLedger,
};
