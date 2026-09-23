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

describe("Bookmarks", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("saves, lists, rejects duplicates, and removes a bookmarked book", async () => {
    const owner = await createVerifiedUser("bookmark_owner");
    const reader = await createVerifiedUser("bookmark_reader");
    accountIds.push(owner.accountId, reader.accountId);

    const [bookId] = await db("books").insert({
      owner_id: owner.accountId,
      title: `Bookmark Book ${Date.now()}`,
      slug: `bookmark-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);

    const bookmark = await request(app)
      .post("/api/bookmarks")
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ bookId, folder: "Đang đọc" });
    expect(bookmark.status).toBe(201);
    expect(bookmark.body.data.bookmark.book_id).toBe(bookId);

    const duplicate = await request(app)
      .post("/api/bookmarks")
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ bookId });
    expect(duplicate.status).toBe(409);

    const missingBook = await request(app)
      .post("/api/bookmarks")
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ bookId: 999999999 });
    expect(missingBook.status).toBe(404);

    const bookmarks = await request(app)
      .get("/api/me/bookmarks")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(bookmarks.status).toBe(200);
    expect(
      bookmarks.body.data.items.some((item) => item.book_id === bookId),
    ).toBe(true);

    const removed = await request(app)
      .delete(`/api/bookmarks/${bookId}`)
      .set("Authorization", `Bearer ${reader.token}`);
    expect(removed.status).toBe(200);

    const remaining = await request(app)
      .get("/api/me/bookmarks")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(
      remaining.body.data.items.some((item) => item.book_id === bookId),
    ).toBe(false);
  });
});
