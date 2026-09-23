const db = require("../config/db");

function dateParts(input) {
  const date = input ? new Date(`${input}T00:00:00.000Z`) : new Date();
  if (!input) date.setUTCDate(date.getUTCDate() - 1);
  const statDate = date.toISOString().slice(0, 10);
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    statDate,
    start: `${statDate} 00:00:00`,
    end: `${next.toISOString().slice(0, 10)} 00:00:00`,
  };
}

function inRange(query, column, start, end) {
  return query.where(column, ">=", start).andWhere(column, "<", end);
}

function numeric(value) {
  return Number(value || 0);
}

function decimal(value) {
  return numeric(value).toFixed(2);
}

async function calculatePlatform(trx, range) {
  const [
    newUsers,
    activeReaders,
    activeAuthors,
    sessions,
    newBooks,
    newChapters,
    views,
    sales,
    topup,
    withdraw,
    refund,
  ] = await Promise.all([
    inRange(trx("accounts"), "created_at", range.start, range.end)
      .count({ count: "id" })
      .first(),
    inRange(trx("chapter_views"), "viewed_at", range.start, range.end)
      .whereNotNull("account_id")
      .countDistinct({ count: "account_id" })
      .first(),
    inRange(
      trx("chapter_views as views"),
      "views.viewed_at",
      range.start,
      range.end,
    )
      .join("books", "books.id", "views.book_id")
      .countDistinct({ count: "books.owner_id" })
      .first(),
    inRange(trx("user_sessions"), "created_at", range.start, range.end)
      .count({ count: "id" })
      .first(),
    inRange(trx("books"), "created_at", range.start, range.end)
      .count({ count: "id" })
      .first(),
    inRange(trx("chapters"), "created_at", range.start, range.end)
      .count({ count: "id" })
      .first(),
    inRange(trx("chapter_views"), "viewed_at", range.start, range.end)
      .count({ count: "id" })
      .first(),
    inRange(trx("transactions"), "created_at", range.start, range.end)
      .where({ transaction_type: "purchase", status: "success" })
      .select(
        trx.raw("COUNT(*) AS chaptersSold"),
        trx.raw("COALESCE(SUM(amount), 0) AS grossRevenue"),
        trx.raw("COALESCE(SUM(platform_fee), 0) AS platformRevenue"),
        trx.raw("COALESCE(SUM(seller_amount), 0) AS authorRevenue"),
      )
      .first(),
    inRange(trx("transactions"), "created_at", range.start, range.end)
      .where({ transaction_type: "topup", status: "success" })
      .sum({ total: "amount" })
      .first(),
    inRange(trx("transactions"), "created_at", range.start, range.end)
      .where({ transaction_type: "withdraw", status: "success" })
      .sum({ total: "amount" })
      .first(),
    inRange(trx("transactions"), "created_at", range.start, range.end)
      .where({ transaction_type: "refund", status: "success" })
      .sum({ total: "amount" })
      .first(),
  ]);

  return {
    stat_date: range.statDate,
    new_users: numeric(newUsers.count),
    active_readers: numeric(activeReaders.count),
    active_authors: numeric(activeAuthors.count),
    total_sessions: numeric(sessions.count),
    new_books: numeric(newBooks.count),
    new_chapters: numeric(newChapters.count),
    total_views: numeric(views.count),
    chapters_sold: numeric(sales.chaptersSold),
    gross_revenue: decimal(sales.grossRevenue),
    platform_revenue: decimal(sales.platformRevenue),
    author_revenue: decimal(sales.authorRevenue),
    total_topup: decimal(topup.total),
    total_withdraw: decimal(withdraw.total),
    total_refund: decimal(refund.total),
  };
}

async function calculateBookStats(trx, range) {
  const [books, views, sales, follows, comments] = await Promise.all([
    inRange(trx("books"), "created_at", range.start, range.end)
      .select("id", "owner_id")
      .whereNull("deleted_at"),
    inRange(trx("chapter_views"), "viewed_at", range.start, range.end)
      .join("books", "books.id", "chapter_views.book_id")
      .whereNull("books.deleted_at")
      .select("chapter_views.book_id")
      .count({ views: "chapter_views.id" })
      .countDistinct({ unique_readers: "chapter_views.account_id" })
      .groupBy("chapter_views.book_id"),
    inRange(
      trx("transactions"),
      "transactions.created_at",
      range.start,
      range.end,
    )
      .where({
        "transactions.transaction_type": "purchase",
        "transactions.status": "success",
      })
      .whereNotNull("transactions.book_id")
      .join("books", "books.id", "transactions.book_id")
      .whereNull("books.deleted_at")
      .select("transactions.book_id")
      .count({ chapters_sold: "transactions.id" })
      .sum({ revenue: "seller_amount" })
      .groupBy("transactions.book_id"),
    inRange(trx("follows"), "follows.created_at", range.start, range.end)
      .where({ "follows.target_type": "book" })
      .join("books", "books.id", "follows.target_id")
      .whereNull("books.deleted_at")
      .select({ book_id: "target_id" })
      .count({ new_followers: "follows.id" })
      .groupBy("target_id"),
    inRange(trx("comments"), "comments.created_at", range.start, range.end)
      .join("books", "books.id", "comments.book_id")
      .whereNull("books.deleted_at")
      .select("comments.book_id")
      .count({ new_comments: "comments.id" })
      .groupBy("comments.book_id"),
  ]);

  const byId = new Map();
  const ensure = (bookId) => {
    const id = Number(bookId);
    if (!byId.has(id)) {
      byId.set(id, {
        stat_date: range.statDate,
        book_id: id,
        views: 0,
        unique_readers: 0,
        chapters_sold: 0,
        revenue: "0.00",
        new_followers: 0,
        new_comments: 0,
      });
    }
    return byId.get(id);
  };

  books.forEach((book) => ensure(book.id));
  views.forEach((row) =>
    Object.assign(ensure(row.book_id), {
      views: numeric(row.views),
      unique_readers: numeric(row.unique_readers),
    }),
  );
  sales.forEach((row) =>
    Object.assign(ensure(row.book_id), {
      chapters_sold: numeric(row.chapters_sold),
      revenue: decimal(row.revenue),
    }),
  );
  follows.forEach((row) => {
    ensure(row.book_id).new_followers = numeric(row.new_followers);
  });
  comments.forEach((row) => {
    ensure(row.book_id).new_comments = numeric(row.new_comments);
  });

  return { rows: [...byId.values()], books };
}

async function calculateAuthorStats(trx, range, bookStats, books) {
  const authors = new Map();
  const ensure = (accountId) => {
    const id = Number(accountId);
    if (!authors.has(id)) {
      authors.set(id, {
        stat_date: range.statDate,
        account_id: id,
        total_views: 0,
        book_count: 0,
        chapters_sold: 0,
        revenue: "0.00",
        new_followers: 0,
      });
    }
    return authors.get(id);
  };
  const ownerByBook = new Map(
    books.map((book) => [Number(book.id), Number(book.owner_id)]),
  );

  for (const row of bookStats) {
    const ownerId = ownerByBook.get(Number(row.book_id));
    if (!ownerId) continue;
    const author = ensure(ownerId);
    author.total_views += numeric(row.views);
    author.chapters_sold += numeric(row.chapters_sold);
    author.revenue = decimal(Number(author.revenue) + Number(row.revenue));
    author.new_followers += numeric(row.new_followers);
  }

  const bookCounts = await trx("books")
    .select("owner_id")
    .where("created_at", "<", range.end)
    .whereNull("deleted_at")
    .groupBy("owner_id")
    .count({ book_count: "id" });
  bookCounts.forEach((row) => {
    ensure(row.owner_id).book_count = numeric(row.book_count);
  });

  return [...authors.values()];
}

async function rollupDailyStats(inputDate) {
  const range = dateParts(inputDate);
  return db.transaction(async (trx) => {
    const platform = await calculatePlatform(trx, range);
    const bookResult = await calculateBookStats(trx, range);
    const authors = await calculateAuthorStats(
      trx,
      range,
      bookResult.rows,
      bookResult.books,
    );

    await trx("daily_platform_stats")
      .insert(platform)
      .onConflict("stat_date")
      .merge();
    if (bookResult.rows.length) {
      await trx("daily_book_stats")
        .insert(bookResult.rows)
        .onConflict(["stat_date", "book_id"])
        .merge();
    }
    if (authors.length) {
      await trx("daily_author_stats")
        .insert(authors)
        .onConflict(["stat_date", "account_id"])
        .merge();
    }

    return {
      statDate: range.statDate,
      platform: 1,
      books: bookResult.rows.length,
      authors: authors.length,
    };
  });
}

module.exports = { rollupDailyStats, dateParts };
