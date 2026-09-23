const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

async function createVerifiedUser(prefix) {
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

  const loggedIn = await request(app)
    .post("/api/auth/login")
    .send({ identifier: email, password, platform: "web" });
  expect(loggedIn.status).toBe(200);

  return {
    accountId: registered.body.data.account.id,
    token: loggedIn.body.data.accessToken,
  };
}

describe("Follow and reading history", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("allows following books and authors and tracking reading progress", async () => {
    const author = await createVerifiedUser("follow_author");
    const reader = await createVerifiedUser("follow_reader");
    accountIds.push(author.accountId, reader.accountId);

    const bookInsert = await db("books").insert({
      owner_id: author.accountId,
      title: `Follow Book ${Date.now()}`,
      slug: `follow-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    const bookId = bookInsert[0];
    bookIds.push(bookId);
    await db("book_categories").insert({ book_id: bookId, category_id: 1 });

    const chapterInsert = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Read chapter",
      content: "This content is useful",
      preview_text: "Preview",
      is_free: 1,
      price: "0.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const chapterId = chapterInsert[0];

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

    const follows = await request(app)
      .get("/api/me/follows")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(follows.status).toBe(200);
    expect(follows.body.data.items.length).toBeGreaterThanOrEqual(2);

    const updateHistory = await request(app)
      .put(`/api/me/reading-history/${bookId}`)
      .set("Authorization", `Bearer ${reader.token}`)
      .send({
        lastChapterId: chapterId,
        progressPercent: "42.50",
        scrollPosition: 1200,
        chaptersRead: 1,
        totalReadTime: 3600,
      });
    expect(updateHistory.status).toBe(200);
    expect(updateHistory.body.data.history.book_id).toBe(bookId);

    const history = await request(app)
      .get("/api/me/reading-history")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(history.status).toBe(200);
    expect(
      history.body.data.items.some((item) => item.book_id === bookId),
    ).toBe(true);

    const unfollow = await request(app)
      .delete(`/api/follows/book/${bookId}`)
      .set("Authorization", `Bearer ${reader.token}`);
    expect(unfollow.status).toBe(200);

    const remaining = await request(app)
      .get("/api/me/follows")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(
      remaining.body.data.items.some(
        (item) => item.target_type === "book" && item.target_id === bookId,
      ),
    ).toBe(false);
  });
});
