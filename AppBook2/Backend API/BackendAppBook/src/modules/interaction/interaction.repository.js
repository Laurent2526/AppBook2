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

async function listRatingsByAccount(accountId) {
  return db("ratings")
    .join("books", "books.id", "ratings.book_id")
    .select(
      "ratings.id",
      "ratings.book_id",
      "ratings.score",
      "ratings.created_at",
      "ratings.updated_at",
      "books.title as book_title",
      "books.cover_url",
    )
    .where({ "ratings.account_id": accountId })
    .whereNull("books.deleted_at")
    .orderBy("ratings.updated_at", "desc");
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
    .join("accounts", "accounts.id", "comments.account_id")
    .select(
      "comments.id",
      "comments.account_id",
      "accounts.username as account_username",
      "accounts.full_name as account_name",
      "comments.book_id",
      "comments.chapter_id",
      "comments.parent_id",
      "comments.content",
      "comments.status",
      "comments.like_count",
      "comments.reply_count",
      "comments.created_at",
      "comments.updated_at",
    )
    .where({ "comments.book_id": bookId, "comments.status": "visible" })
    .whereNull("comments.deleted_at")
    .orderBy("comments.created_at", "asc");
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
  listRatingsByAccount,
  createRating,
  updateRating,
  refreshRatingAggregate,
  findComment,
  createComment,
  listVisibleComments,
  updateComment,
  softDeleteComment,
};
