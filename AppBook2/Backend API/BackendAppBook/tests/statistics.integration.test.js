const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");
const { rollupDailyStats } = require("../src/jobs/rollupDailyStats");

async function createUser(prefix, role = "user") {
  const suffix = Date.now() + Math.floor(Math.random() * 10000);
  const email = `${prefix}_${suffix}@example.com`;
  const username = `${prefix}_${suffix}`;
  const password = "Password123";

  const registered = await request(app)
    .post("/api/auth/register")
    .send({ username, email, channel: "email", password });
  expect(registered.status).toBe(201);

  const verified = await request(app)
    .post("/api/auth/verify-otp")
    .send({ target: email, code: registered.body.data.debugOtp });
  expect(verified.status).toBe(200);

  const accountId = registered.body.data.account.id;
  if (role !== "user")
    await db("accounts").where({ id: accountId }).update({ role });

  const loggedIn = await request(app)
    .post("/api/auth/login")
    .send({ identifier: email, password, platform: "web" });
  expect(loggedIn.status).toBe(200);

  return { accountId, token: loggedIn.body.data.accessToken };
}

describe("Admin statistics", () => {
  const accountIds = [];
  const bookIds = [];
  const statDates = ["2026-09-20", "2026-09-21", "2099-01-15"];

  afterAll(async () => {
    await db("daily_platform_stats").whereIn("stat_date", statDates).del();
    await db("daily_book_stats").whereIn("stat_date", statDates).del();
    await db("daily_author_stats").whereIn("stat_date", statDates).del();
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("returns aggregate platform, book, and author statistics to admins", async () => {
    const owner = await createUser("stats_owner");
    const admin = await createUser("stats_admin", "admin");
    const reader = await createUser("stats_reader");
    accountIds.push(owner.accountId, admin.accountId, reader.accountId);

    const [bookId] = await db("books").insert({
      owner_id: owner.accountId,
      title: `Stats Book ${Date.now()}`,
      slug: `stats-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);

    await db("daily_platform_stats").insert([
      {
        stat_date: statDates[0],
        new_users: 4,
        total_views: 100,
        gross_revenue: "10000.00",
        platform_revenue: "500.00",
        author_revenue: "9500.00",
      },
      {
        stat_date: statDates[1],
        new_users: 6,
        total_views: 150,
        gross_revenue: "20000.00",
        platform_revenue: "1000.00",
        author_revenue: "19000.00",
      },
    ]);
    await db("daily_book_stats").insert({
      stat_date: statDates[1],
      book_id: bookId,
      views: 150,
      unique_readers: 20,
      chapters_sold: 3,
      revenue: "2850.00",
    });
    await db("daily_author_stats").insert({
      stat_date: statDates[1],
      account_id: owner.accountId,
      total_views: 150,
      book_count: 1,
      chapters_sold: 3,
      revenue: "2850.00",
    });

    const forbidden = await request(app)
      .get("/api/admin/statistics/platform")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(forbidden.status).toBe(403);

    const platform = await request(app)
      .get("/api/admin/statistics/platform")
      .query({ from: statDates[0], to: statDates[1] })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(platform.status).toBe(200);
    expect(platform.body.data.items).toHaveLength(2);
    expect(platform.body.data.items[1].gross_revenue).toBe("20000.00");

    const books = await request(app)
      .get("/api/admin/statistics/books")
      .query({ from: statDates[0], to: statDates[1], bookId })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(books.status).toBe(200);
    expect(books.body.data.items).toHaveLength(1);
    expect(books.body.data.items[0].book_id).toBe(bookId);

    const authors = await request(app)
      .get("/api/admin/statistics/authors")
      .query({
        from: statDates[0],
        to: statDates[1],
        accountId: owner.accountId,
      })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(authors.status).toBe(200);
    expect(authors.body.data.items).toHaveLength(1);
    expect(authors.body.data.items[0].account_id).toBe(owner.accountId);
  });

  it("rolls source events into daily aggregates idempotently", async () => {
    const rollupDay = String((Date.now() % 28) + 1).padStart(2, "0");
    const rollupDate = `2099-01-${rollupDay}`;
    const owner = await createUser("rollup_owner");
    const reader = await createUser("rollup_reader");
    accountIds.push(owner.accountId, reader.accountId);

    const [bookId] = await db("books").insert({
      owner_id: owner.accountId,
      title: `Rollup Book ${Date.now()}`,
      slug: `rollup-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);

    const [chapterId] = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Rollup chapter",
      content: "Content",
      preview_text: "Preview",
      is_free: 0,
      price: "100.00",
      status: "published",
      published_at: db.fn.now(),
    });

    await db("chapter_views").insert({
      chapter_id: chapterId,
      book_id: bookId,
      account_id: reader.accountId,
      viewed_at: `${rollupDate} 10:00:00`,
    });
    await db("follows").insert({
      follower_id: reader.accountId,
      target_type: "book",
      target_id: bookId,
      created_at: `${rollupDate} 10:00:00`,
    });
    await db("comments").insert({
      account_id: reader.accountId,
      book_id: bookId,
      content: "Daily rollup comment",
      created_at: `${rollupDate} 10:00:00`,
    });
    await db("transactions").insert({
      code: `ROLLUP${Date.now()}`,
      transaction_type: "purchase",
      buyer_id: reader.accountId,
      seller_id: owner.accountId,
      book_id: bookId,
      chapter_id: chapterId,
      amount: "100.00",
      platform_fee: "5.00",
      seller_amount: "95.00",
      status: "success",
      created_at: `${rollupDate} 10:00:00`,
      completed_at: `${rollupDate} 10:00:00`,
    });

    await rollupDailyStats(rollupDate);
    await rollupDailyStats(rollupDate);

    const bookStats = await db("daily_book_stats")
      .where({ stat_date: rollupDate, book_id: bookId })
      .first();
    expect(bookStats.views).toBe(1);
    expect(bookStats.unique_readers).toBe(1);
    expect(bookStats.chapters_sold).toBe(1);
    expect(bookStats.revenue).toBe("95.00");
    expect(bookStats.new_followers).toBe(1);
    expect(bookStats.new_comments).toBe(1);

    const platformStats = await db("daily_platform_stats")
      .where({ stat_date: rollupDate })
      .first();
    expect(platformStats.total_views).toBe(1);
    expect(platformStats.chapters_sold).toBe(1);
    expect(platformStats.gross_revenue).toBe("100.00");
  });
});
