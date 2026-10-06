const db = require("../../config/db");

async function listPublic({
  page,
  limit,
  search,
  categoryId,
  writingStatus,
  sortBy = "latest",
}) {
  const query = db("v_public_books as books")
    .leftJoin("books as source", "source.id", "books.id")
    .select(
      "books.*",
      "source.owner_id as owner_id",
      "source.total_revenue",
      db.raw(
        "(SELECT GROUP_CONCAT(book_categories.category_id) FROM book_categories WHERE book_categories.book_id = books.id) AS category_ids",
      ),
    )
    .distinct("books.id")
    .limit(limit)
    .offset((page - 1) * limit);

  if (sortBy === "hot") {
    query
      .orderBy("books.view_count", "desc")
      .orderBy("books.purchase_count", "desc")
      .orderBy("books.follower_count", "desc")
      .orderBy("books.last_chapter_at", "desc");
  } else {
    query.orderBy("books.last_chapter_at", "desc");
  }

  if (search) {
    query.where((builder) =>
      builder
        .where("books.title", "like", `%${search}%`)
        .orWhere("books.author_name", "like", `%${search}%`)
        .orWhere("books.description", "like", `%${search}%`)
        .orWhereIn("books.id", function categorySearch() {
          this.select("links.book_id")
            .from("book_categories as links")
            .join("categories", "categories.id", "links.category_id")
            .where({ "categories.is_active": 1 })
            .where("categories.name", "like", `%${search}%`);
        }),
    );
  }
  if (writingStatus) query.where("books.writing_status", writingStatus);
  if (categoryId)
    query
      .join("book_categories", "book_categories.book_id", "books.id")
      .where("book_categories.category_id", categoryId);

  const rows = (await query).map((book) => ({
    ...book,
    category_ids: book.category_ids
      ? String(book.category_ids).split(",").map(Number)
      : [],
  }));
  return { rows, page, limit };
}

async function listMine({ ownerId, page, limit, status, search }) {
  const query = db("books")
    .select("books.*")
    .where({ owner_id: ownerId })
    .whereNull("deleted_at")
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy("updated_at", "desc");

  if (status) query.where("books.status", status);
  if (search) {
    query.where((builder) =>
      builder
        .where("books.title", "like", `%${search}%`)
        .orWhere("books.author_name", "like", `%${search}%`)
        .orWhere("books.description", "like", `%${search}%`),
    );
  }

  const rows = await query;
  const summary = await db("books")
    .where({ owner_id: ownerId })
    .whereNull("deleted_at")
    .select(
      db.raw("COUNT(*) as total"),
      db.raw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending"),
      db.raw(
        "SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published",
      ),
      db.raw(
        "SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected",
      ),
      db.raw(
        "SUM(CASE WHEN status = 'pending_delete' THEN 1 ELSE 0 END) as pending_delete",
      ),
    )
    .first();

  return {
    rows,
    page,
    limit,
    summary: {
      total: Number(summary?.total || 0),
      pending: Number(summary?.pending || 0),
      published: Number(summary?.published || 0),
      rejected: Number(summary?.rejected || 0),
      pendingDelete: Number(summary?.pending_delete || 0),
    },
  };
}

async function findPublicById(id) {
  return db("v_public_books as books")
    .join("books as source", "source.id", "books.id")
    .select("books.*", "source.owner_id as owner_id", "source.total_revenue")
    .where("books.id", id)
    .first();
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

async function recordChapterView(chapterId, bookId, accountId) {
  return db.transaction(async (trx) => {
    await trx("chapter_views").insert({
      chapter_id: chapterId,
      book_id: bookId,
      account_id: accountId || null,
      viewed_at: trx.fn.now(),
    });
    await trx("chapters").where({ id: chapterId }).increment("view_count", 1);
    await trx("books").where({ id: bookId }).increment("view_count", 1);
  });
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
  listMine,
  findPublicById,
  findBookById,
  createBook,
  attachCategories,
  categoriesExist,
  listChapters,
  findChapter,
  findActivePurchase,
  recordChapterView,
  createChapter,
  updateBookCategories,
  findPendingModeration,
};
