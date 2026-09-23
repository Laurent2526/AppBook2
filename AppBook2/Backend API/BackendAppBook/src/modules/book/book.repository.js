const db = require("../../config/db");

async function listPublic({ page, limit, search, categoryId, writingStatus }) {
  const query = db("v_public_books as books")
    .select("books.*")
    .distinct("books.id")
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy("books.last_chapter_at", "desc");

  if (search) {
    query.where((builder) =>
      builder
        .where("books.title", "like", `%${search}%`)
        .orWhere("books.author_name", "like", `%${search}%`)
        .orWhere("books.description", "like", `%${search}%`),
    );
  }
  if (writingStatus) query.where("books.writing_status", writingStatus);
  if (categoryId)
    query
      .join("book_categories", "book_categories.book_id", "books.id")
      .where("book_categories.category_id", categoryId);

  const rows = await query;
  return { rows, page, limit };
}

async function findPublicById(id) {
  return db("v_public_books").where({ id }).first();
}

async function findBookById(trx, id) {
  return trx("books").where({ id }).first();
}

async function createBook(trx, data) {
  const [id] = await trx("books").insert(data);
  return findBookById(trx, id);
}

async function attachCategories(trx, bookId, categoryIds) {
  await trx("book_categories").insert(
    categoryIds.map((categoryId) => ({
      book_id: bookId,
      category_id: categoryId,
    })),
  );
}

async function categoriesExist(trx, categoryIds) {
  const rows = await trx("categories")
    .whereIn("id", categoryIds)
    .where({ is_active: 1 })
    .select("id");
  return rows.length === new Set(categoryIds).size;
}

async function listChapters(bookId) {
  return db("chapters")
    .select(
      "id",
      "book_id",
      "chapter_number",
      "title",
      "preview_text",
      "is_free",
      "price",
      "status",
      "word_count",
      "view_count",
      "purchase_count",
      "published_at",
    )
    .where({ book_id: bookId, status: "published" })
    .whereNull("deleted_at")
    .orderBy("chapter_number", "asc");
}

async function findChapter(id) {
  return db("chapters").where({ id }).whereNull("deleted_at").first();
}

async function findActivePurchase(accountId, chapterId) {
  return db("purchases")
    .where({ account_id: accountId, chapter_id: chapterId, is_revoked: 0 })
    .first();
}

async function createChapter(trx, data) {
  const [id] = await trx("chapters").insert(data);
  return trx("chapters").where({ id }).first();
}

async function updateBookCategories(trx, bookId, categoryIds) {
  await trx("book_categories").where({ book_id: bookId }).delete();
  await attachCategories(trx, bookId, categoryIds);
}

async function findPendingModeration(trx, requestType, targetType, targetId) {
  return trx("moderation_requests")
    .where({
      request_type: requestType,
      target_type: targetType,
      target_id: targetId,
      status: "pending",
    })
    .first();
}

module.exports = {
  listPublic,
  findPublicById,
  findBookById,
  createBook,
  attachCategories,
  categoriesExist,
  listChapters,
  findChapter,
  findActivePurchase,
  createChapter,
  updateBookCategories,
  findPendingModeration,
};
