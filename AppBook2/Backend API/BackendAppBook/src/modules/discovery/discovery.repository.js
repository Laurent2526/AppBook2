const db = require("../../config/db");

function publicBookQuery() {
  return db("v_public_books as books")
    .leftJoin("books as source", "source.id", "books.id")
    .select(
      "books.*",
      "source.total_revenue",
      db.raw(
        "(SELECT GROUP_CONCAT(book_categories.category_id) FROM book_categories WHERE book_categories.book_id = books.id) AS category_ids",
      ),
    );
}

function mapBookCategories(rows) {
  return rows.map((book) => ({
    ...book,
    category_ids: book.category_ids
      ? String(book.category_ids).split(",").map(Number)
      : [],
  }));
}

async function listFeaturedAuthors(limit, search) {
  const query = db("accounts")
    .leftJoin("books", function joinPublishedBooks() {
      this.on("books.owner_id", "accounts.id")
        .andOn("books.status", db.raw("?", ["published"]))
        .andOnNull("books.deleted_at");
    })
    .where({ "accounts.status": "active", "accounts.is_author": 1 });
  if (search) {
    query.where((builder) =>
      builder
        .where("accounts.username", "like", `%${search}%`)
        .orWhere("accounts.full_name", "like", `%${search}%`),
    );
  }
  return query
    .select(
      "accounts.id",
      "accounts.username",
      "accounts.full_name",
      "accounts.avatar_url",
      db.raw("COUNT(DISTINCT books.id) AS book_count"),
      db.raw("COALESCE(SUM(books.view_count), 0) AS total_views"),
      db.raw("COALESCE(SUM(books.purchase_count), 0) AS total_purchases"),
      db.raw("COALESCE(SUM(books.total_revenue), 0) AS total_revenue"),
      db.raw(
        "(SELECT COUNT(*) FROM follows WHERE follows.target_type = 'account' AND follows.target_id = accounts.id) AS follower_count",
      ),
    )
    .groupBy(
      "accounts.id",
      "accounts.username",
      "accounts.full_name",
      "accounts.avatar_url",
    )
    .orderBy("total_views", "desc")
    .orderBy("follower_count", "desc")
    .orderBy("book_count", "desc")
    .limit(limit);
}

async function getReadBookIds(accountId) {
  if (!accountId) return [];
  return db("reading_history")
    .where({ account_id: accountId })
    .pluck("book_id");
}

async function getInterestCategories(accountId, limit = 5) {
  if (!accountId) return [];
  const rows = await db("reading_history as history")
    .join("book_categories as links", "links.book_id", "history.book_id")
    .join("categories", "categories.id", "links.category_id")
    .where("history.account_id", accountId)
    .where({ "categories.is_active": 1 })
    .select("links.category_id")
    .sum({
      weight: db.raw("GREATEST(COALESCE(history.chapters_read, 0), 1)"),
    })
    .groupBy("links.category_id")
    .orderBy("weight", "desc")
    .limit(limit);
  return rows.map((row) => Number(row.category_id));
}

async function listRecommendations(accountId, requestedCategoryIds, limit) {
  const readBookIds = await getReadBookIds(accountId);
  const interestCategoryIds = requestedCategoryIds.length
    ? requestedCategoryIds
    : await getInterestCategories(accountId);
  const query = publicBookQuery();

  if (readBookIds.length) query.whereNotIn("books.id", readBookIds);
  if (interestCategoryIds.length) {
    query.whereIn("books.id", function categoryMatches() {
      this.select("links.book_id")
        .from("book_categories as links")
        .whereIn("links.category_id", interestCategoryIds);
    });
  }

  const rows = await query
    .orderBy("books.view_count", "desc")
    .orderBy("books.purchase_count", "desc")
    .orderBy("books.follower_count", "desc")
    .limit(limit);
  return {
    rows: mapBookCategories(rows),
    categoryIds: interestCategoryIds,
    basedOn: interestCategoryIds.length
      ? requestedCategoryIds.length
        ? "selected_categories"
        : "reading_history"
      : "popular_books",
  };
}

async function listFollowFeed(accountId) {
  const latestBookId = db("books as latest")
    .select("latest.id")
    .whereColumn("latest.owner_id", "accounts.id")
    .where({ "latest.status": "published" })
    .whereNull("latest.deleted_at")
    .orderByRaw("COALESCE(latest.last_chapter_at, latest.published_at) DESC")
    .limit(1);

  const accountRows = await db("follows")
    .join("accounts", "accounts.id", "follows.target_id")
    .leftJoin("books as latest", "latest.id", latestBookId)
    .leftJoin(
      "v_public_books as latest_public",
      "latest_public.id",
      "latest.id",
    )
    .where({
      "follows.follower_id": accountId,
      "follows.target_type": "account",
      "accounts.status": "active",
    })
    .select(
      "accounts.id",
      "accounts.username",
      "accounts.full_name",
      "accounts.avatar_url",
      "latest_public.id as latest_book_id",
      "latest_public.title as latest_book_title",
      "latest_public.cover_url as latest_book_cover",
    )
    .orderBy("follows.created_at", "desc");

  const followingBooks = mapBookCategories(
    await publicBookQuery()
      .join("follows", function joinBookFollows() {
        this.on("follows.target_id", "books.id").andOn(
          "follows.target_type",
          db.raw("?", ["book"]),
        );
      })
      .where("follows.follower_id", accountId)
      .orderBy("follows.created_at", "desc")
      .limit(100),
  );

  const savedBooks = mapBookCategories(
    await publicBookQuery()
      .join("bookmarks", "bookmarks.book_id", "books.id")
      .where("bookmarks.account_id", accountId)
      .orderBy("bookmarks.created_at", "desc")
      .limit(100),
  );

  return {
    following: accountRows.map((account) => ({
      id: account.id,
      name: account.full_name || account.username,
      avatar_url: account.avatar_url,
      latest_book: account.latest_book_id
        ? {
            id: account.latest_book_id,
            title: account.latest_book_title,
            cover_url: account.latest_book_cover,
          }
        : null,
    })),
    followingBooks,
    savedBooks,
  };
}

module.exports = {
  listFeaturedAuthors,
  listRecommendations,
  listFollowFeed,
};
