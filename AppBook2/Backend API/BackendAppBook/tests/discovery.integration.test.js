const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

async function createUser(prefix, isAuthor = false) {
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
  if (isAuthor)
    await db("accounts").where({ id: accountId }).update({ is_author: 1 });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ identifier: email, password, platform: "web" });
  expect(login.status).toBe(200);
  return { accountId, username, token: login.body.data.accessToken };
}

describe("Discovery business data", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("ranks books/authors from counters and recommends unread books by reading history", async () => {
    const author = await createUser("discovery_author", true);
    const reader = await createUser("discovery_reader");
    accountIds.push(author.accountId, reader.accountId);

    const categories = await db("categories")
      .where({ is_active: 1 })
      .select("id")
      .orderBy("id")
      .limit(2);
    expect(categories.length).toBeGreaterThan(0);
    const preferredCategoryId = categories[0].id;
    const otherCategoryId = categories[1]?.id || preferredCategoryId;
    const stamp = Date.now();

    const [readBookId] = await db("books").insert({
      owner_id: author.accountId,
      title: `History source ${stamp}`,
      slug: `history-source-${stamp}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      view_count: 45,
      purchase_count: 3,
      total_revenue: "285.00",
      published_at: db.fn.now(),
    });
    const [recommendedBookId] = await db("books").insert({
      owner_id: author.accountId,
      title: `History match ${stamp}`,
      slug: `history-match-${stamp}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      view_count: 120,
      purchase_count: 8,
      follower_count: 4,
      total_revenue: "760.00",
      published_at: db.fn.now(),
    });
    const [hotBookId] = await db("books").insert({
      owner_id: author.accountId,
      title: `Search needle hot ${stamp}`,
      slug: `search-needle-hot-${stamp}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      view_count: 900,
      purchase_count: 70,
      follower_count: 25,
      total_revenue: "6650.00",
      published_at: db.fn.now(),
    });
    bookIds.push(readBookId, recommendedBookId, hotBookId);

    await db("book_categories").insert([
      { book_id: readBookId, category_id: preferredCategoryId },
      { book_id: recommendedBookId, category_id: preferredCategoryId },
      { book_id: hotBookId, category_id: otherCategoryId },
    ]);

    const [chapterId] = await db("chapters").insert({
      book_id: readBookId,
      chapter_number: 1,
      title: "History chapter",
      content: "History content",
      is_free: 1,
      price: "0.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const history = await request(app)
      .put(`/api/me/reading-history/${readBookId}`)
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ lastChapterId: chapterId, chaptersRead: 4 });
    expect(history.status).toBe(200);

    const hot = await request(app).get("/api/books?sortBy=hot&limit=20");
    expect(hot.status).toBe(200);
    expect(hot.body.data.rows[0].id).toBe(hotBookId);
    expect(hot.body.data.rows[0].category_ids).toContain(otherCategoryId);

    const search = await request(app).get(
      `/api/books?search=Search%20needle%20hot%20${stamp}`,
    );
    expect(search.status).toBe(200);
    expect(search.body.data.rows.map((book) => book.id)).toContain(hotBookId);

    const categoryName = await db("categories")
      .where({ id: preferredCategoryId })
      .first();
    const categorySearch = await request(app).get(
      `/api/books?search=${encodeURIComponent(categoryName.name)}`,
    );
    expect(categorySearch.status).toBe(200);
    expect(categorySearch.body.data.rows.map((book) => book.id)).toContain(
      recommendedBookId,
    );

    const recommendations = await request(app)
      .get("/api/discovery/recommendations?limit=20")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(recommendations.status).toBe(200);
    expect(recommendations.body.data.basedOn).toBe("reading_history");
    expect(recommendations.body.data.categoryIds).toContain(
      preferredCategoryId,
    );
    expect(recommendations.body.data.rows.map((book) => book.id)).toContain(
      recommendedBookId,
    );
    expect(recommendations.body.data.rows.map((book) => book.id)).not.toContain(
      readBookId,
    );

    const featured = await request(app).get(
      "/api/discovery/featured-authors?limit=10",
    );
    expect(featured.status).toBe(200);
    const featuredAuthor = featured.body.data.authors.find(
      (item) => item.id === author.accountId,
    );
    expect(featuredAuthor).toBeTruthy();
    expect(Number(featuredAuthor.total_views)).toBeGreaterThanOrEqual(1065);

    const featuredSearch = await request(app).get(
      `/api/discovery/featured-authors?search=${encodeURIComponent(author.username)}`,
    );
    expect(featuredSearch.status).toBe(200);
    expect(
      featuredSearch.body.data.authors.some(
        (item) => item.id === author.accountId,
      ),
    ).toBe(true);
  });

  it("returns actual followed authors, followed books, and bookmarks", async () => {
    const author = await createUser("feed_author", true);
    const reader = await createUser("feed_reader");
    accountIds.push(author.accountId, reader.accountId);
    const [bookId] = await db("books").insert({
      owner_id: author.accountId,
      title: `Feed book ${Date.now()}`,
      slug: `feed-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);

    const followAuthor = await request(app)
      .post("/api/follows")
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ targetType: "account", targetId: author.accountId });
    expect(followAuthor.status).toBe(201);
    const followBook = await request(app)
      .post("/api/follows")
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ targetType: "book", targetId: bookId });
    expect(followBook.status).toBe(201);
    const bookmark = await request(app)
      .post("/api/bookmarks")
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ bookId });
    expect(bookmark.status).toBe(201);

    const feed = await request(app)
      .get("/api/discovery/following")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(feed.status).toBe(200);
    expect(feed.body.data.following[0].id).toBe(author.accountId);
    expect(feed.body.data.followingBooks[0].id).toBe(bookId);
    expect(feed.body.data.savedBooks[0].id).toBe(bookId);
  });
});
