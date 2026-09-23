const db = require("../../config/db");

async function findWallet(accountId) {
  return db("wallets")
    .select(
      "account_id",
      "balance",
      "pending_withdraw",
      "total_topup",
      "total_spent",
      "total_earned",
      "total_withdrawn",
      "currency",
      "version",
      "updated_at",
    )
    .where({ account_id: accountId })
    .first();
}

async function listEntries(accountId, { page, limit }) {
  const rows = await db("wallet_entries")
    .select(
      "id",
      "transaction_id",
      "direction",
      "amount",
      "balance_before",
      "balance_after",
      "reason",
      "note",
      "created_at",
    )
    .where({ account_id: accountId })
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset((page - 1) * limit);
  return { rows, page, limit };
}

async function listPurchases(accountId, { page, limit }) {
  const rows = await db("purchases as purchases")
    .join("books", "books.id", "purchases.book_id")
    .join("chapters", "chapters.id", "purchases.chapter_id")
    .select(
      "purchases.id",
      "purchases.book_id",
      "purchases.chapter_id",
      "purchases.combo_id",
      "purchases.transaction_id",
      "purchases.price_paid",
      "purchases.is_revoked",
      "purchases.purchased_at",
      "books.title as book_title",
      "chapters.title as chapter_title",
      "chapters.chapter_number",
    )
    .where({ "purchases.account_id": accountId })
    .orderBy("purchases.purchased_at", "desc")
    .limit(limit)
    .offset((page - 1) * limit);
  return { rows, page, limit };
}

async function hasActivePurchase(accountId, chapterId) {
  return db("purchases")
    .where({ account_id: accountId, chapter_id: chapterId, is_revoked: 0 })
    .first();
}

async function purchaseChapter(accountId, chapterId) {
  const connection = await db.client.acquireConnection();
  try {
    const [resultSets] = await connection
      .promise()
      .query(
        "CALL sp_purchase_chapter(?, ?, @purchase_result, @purchase_txn_id); SELECT @purchase_result AS result, @purchase_txn_id AS txnId;",
        [accountId, chapterId],
      );
    const output = resultSets[1]?.[0] || {};
    return { result: output.result, transactionId: output.txnId || null };
  } finally {
    db.client.releaseConnection(connection);
  }
}

async function findTransaction(accountId, transactionId) {
  return db("transactions")
    .where({ id: transactionId })
    .where((query) =>
      query.where("buyer_id", accountId).orWhere("seller_id", accountId),
    )
    .first();
}

module.exports = {
  findWallet,
  listEntries,
  listPurchases,
  hasActivePurchase,
  purchaseChapter,
  findTransaction,
};
