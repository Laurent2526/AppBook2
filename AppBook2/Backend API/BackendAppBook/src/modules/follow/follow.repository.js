const db = require("../../config/db");

async function findAccountById(id) {
  return db("accounts").where({ id }).whereNull("deleted_at").first();
}

async function findBookById(id) {
  return db("books").where({ id }).whereNull("deleted_at").first();
}

async function findFollow(trx, accountId, targetType, targetId) {
  return trx("follows")
    .where({
      follower_id: accountId,
      target_type: targetType,
      target_id: targetId,
    })
    .first();
}

async function createFollow(trx, data) {
  const [id] = await trx("follows").insert(data);
  return trx("follows").where({ id }).first();
}

async function deleteFollow(trx, accountId, targetType, targetId) {
  return trx("follows")
    .where({
      follower_id: accountId,
      target_type: targetType,
      target_id: targetId,
    })
    .delete();
}

async function listFollows(accountId) {
  return db("follows")
    .select("id", "follower_id", "target_type", "target_id", "created_at")
    .where({ follower_id: accountId })
    .orderBy("created_at", "desc");
}

async function upsertReadingHistory(trx, accountId, bookId, payload) {
  const existing = await trx("reading_history")
    .where({ account_id: accountId, book_id: bookId })
    .first();

  if (existing) {
    await trx("reading_history")
      .where({ id: existing.id })
      .update({
        last_chapter_id: payload.lastChapterId || existing.last_chapter_id,
        progress_percent: payload.progressPercent || existing.progress_percent,
        scroll_position: payload.scrollPosition ?? existing.scroll_position,
        chapters_read: payload.chaptersRead ?? existing.chapters_read,
        total_read_time: payload.totalReadTime ?? existing.total_read_time,
        last_read_at: trx.fn.now(),
      });
    return trx("reading_history").where({ id: existing.id }).first();
  }

  const [id] = await trx("reading_history").insert({
    account_id: accountId,
    book_id: bookId,
    last_chapter_id: payload.lastChapterId || null,
    progress_percent: payload.progressPercent || "0.00",
    scroll_position: payload.scrollPosition || 0,
    chapters_read: payload.chaptersRead || 0,
    total_read_time: payload.totalReadTime || 0,
    last_read_at: trx.fn.now(),
  });

  return trx("reading_history").where({ id }).first();
}

async function listReadingHistory(accountId) {
  return db("reading_history")
    .select(
      "id",
      "account_id",
      "book_id",
      "last_chapter_id",
      "progress_percent",
      "scroll_position",
      "chapters_read",
      "total_read_time",
      "last_read_at",
      "created_at",
    )
    .where({ account_id: accountId })
    .orderBy("last_read_at", "desc");
}

module.exports = {
  findAccountById,
  findBookById,
  findFollow,
  createFollow,
  deleteFollow,
  listFollows,
  upsertReadingHistory,
  listReadingHistory,
};
