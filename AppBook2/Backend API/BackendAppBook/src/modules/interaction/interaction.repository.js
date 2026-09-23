const db = require("../../config/db");

async function findPublicBook(trx, bookId) {
  return trx("books")
    .where({ id: bookId, status: "published" })
    .whereNull("deleted_at")
    .first();
}

async function findPublishedChapter(trx, bookId, chapterId) {
  return trx("chapters")
    .where({ id: chapterId, book_id: bookId, status: "published" })
    .whereNull("deleted_at")
    .first();
}

async function findRating(trx, accountId, bookId) {
  return trx("ratings")
    .where({ account_id: accountId, book_id: bookId })
    .first();
}

async function createRating(trx, data) {
  const [id] = await trx("ratings").insert(data);
  return trx("ratings").where({ id }).first();
}

async function updateRating(trx, id, score) {
  await trx("ratings").where({ id }).update({ score });
  return trx("ratings").where({ id }).first();
}

async function refreshRatingAggregate(trx, bookId) {
  const aggregate = await trx("ratings")
    .where({ book_id: bookId })
    .count({ ratingCount: "id" })
    .avg({ ratingAverage: "score" })
    .first();

  await trx("books")
    .where({ id: bookId })
    .update({
      rating_count: Number(aggregate.ratingCount || 0),
      rating_avg: Number(aggregate.ratingAverage || 0).toFixed(2),
    });
}

async function findComment(trx, id) {
  return trx("comments").where({ id }).first();
}

async function createComment(trx, data) {
  const [id] = await trx("comments").insert(data);
  await trx("books").where({ id: data.book_id }).increment("comment_count", 1);
  if (data.parent_id) {
    await trx("comments")
      .where({ id: data.parent_id })
      .increment("reply_count", 1);
  }
  return findComment(trx, id);
}

async function listVisibleComments(bookId) {
  return db("comments")
    .select(
      "id",
      "account_id",
      "book_id",
      "chapter_id",
      "parent_id",
      "content",
      "status",
      "like_count",
      "reply_count",
      "created_at",
      "updated_at",
    )
    .where({ book_id: bookId, status: "visible" })
    .whereNull("deleted_at")
    .orderBy("created_at", "asc");
}

async function updateComment(trx, id, content) {
  await trx("comments").where({ id }).update({ content });
  return findComment(trx, id);
}

async function softDeleteComment(trx, comment) {
  await trx("comments")
    .where({ id: comment.id })
    .update({ status: "deleted", deleted_at: trx.fn.now() });
  await trx("books")
    .where({ id: comment.book_id })
    .where("comment_count", ">", 0)
    .decrement("comment_count", 1);
  if (comment.parent_id) {
    await trx("comments")
      .where({ id: comment.parent_id })
      .where("reply_count", ">", 0)
      .decrement("reply_count", 1);
  }
}

module.exports = {
  findPublicBook,
  findPublishedChapter,
  findRating,
  createRating,
  updateRating,
  refreshRatingAggregate,
  findComment,
  createComment,
  listVisibleComments,
  updateComment,
  softDeleteComment,
};
