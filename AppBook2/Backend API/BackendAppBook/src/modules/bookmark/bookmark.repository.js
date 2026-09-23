const db = require("../../config/db");

async function findPublicBook(trx, bookId) {
  return trx("books")
    .where({ id: bookId, status: "published" })
    .whereNull("deleted_at")
    .first();
}

async function findBookmark(trx, accountId, bookId) {
  return trx("bookmarks")
    .where({ account_id: accountId, book_id: bookId })
    .first();
}

async function createBookmark(trx, data) {
  const [id] = await trx("bookmarks").insert(data);
  return trx("bookmarks").where({ id }).first();
}

async function deleteBookmark(trx, accountId, bookId) {
  return trx("bookmarks")
    .where({ account_id: accountId, book_id: bookId })
    .delete();
}

async function listBookmarks(accountId) {
  return db("bookmarks")
    .select("id", "account_id", "book_id", "folder", "created_at")
    .where({ account_id: accountId })
    .orderBy("created_at", "desc");
}

module.exports = {
  findPublicBook,
  findBookmark,
  createBookmark,
  deleteBookmark,
  listBookmarks,
};
