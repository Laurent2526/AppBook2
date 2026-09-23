const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

async function createVerifiedUser(prefix) {
  const suffix = Date.now();
  const email = `${prefix}_${suffix}@example.com`;
  const username = `${prefix}_${suffix}`;
  const password = "Password123";

  const registered = await request(app).post("/api/auth/register").send({
    username,
    email,
    channel: "email",
    password,
  });
  expect(registered.status).toBe(201);

  const verified = await request(app).post("/api/auth/verify-otp").send({
    target: email,
    code: registered.body.data.debugOtp,
  });
  expect(verified.status).toBe(200);

  const loggedIn = await request(app).post("/api/auth/login").send({
    identifier: email,
    password,
    platform: "web",
  });
  expect(loggedIn.status).toBe(200);

  return {
    accountId: registered.body.data.account.id,
    token: loggedIn.body.data.accessToken,
  };
}

describe("Category, book and chapter", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("lists active categories", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body.data.categories.length).toBeGreaterThan(0);
  });

  it("creates pending content and enforces ownership", async () => {
    const owner = await createVerifiedUser("book_owner");
    const otherUser = await createVerifiedUser("book_other");
    accountIds.push(owner.accountId, otherUser.accountId);

    const created = await request(app)
      .post("/api/books")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: `Test Book ${Date.now()}`,
        authorName: "Test Author",
        description: "Book for integration test",
        categoryIds: [1],
        writingStatus: "ongoing",
        isMature: false,
        language: "vi",
        freePreviewChapters: 1,
      });

    expect(created.status).toBe(201);
    expect(created.body.data.book.status).toBe("pending");
    const bookId = created.body.data.book.id;
    bookIds.push(bookId);

    const unauthorizedChapter = await request(app)
      .post(`/api/books/${bookId}/chapters`)
      .set("Authorization", `Bearer ${otherUser.token}`)
      .send({
        chapterNumber: 1,
        title: "Not allowed",
        content: "Content",
        isFree: true,
        price: "0",
      });
    expect(unauthorizedChapter.status).toBe(403);

    const chapter = await request(app)
      .post(`/api/books/${bookId}/chapters`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        chapterNumber: 1,
        title: "Chapter one",
        content: "Free chapter content",
        previewText: "Free preview",
        isFree: true,
        price: "0",
      });
    expect(chapter.status).toBe(201);
    expect(chapter.body.data.chapter.status).toBe("pending");
  });

  it("only exposes published books and protects paid chapter content", async () => {
    const owner = await createVerifiedUser("public_owner");
    accountIds.push(owner.accountId);

    const book = await db("books").insert({
      owner_id: owner.accountId,
      title: `Published Book ${Date.now()}`,
      slug: `published-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    const bookId = book[0];
    bookIds.push(bookId);
    await db("book_categories").insert({ book_id: bookId, category_id: 1 });

    const chapter = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Paid chapter",
      content: "Secret paid content",
      preview_text: "Safe preview",
      is_free: 0,
      price: "10000.00",
      status: "published",
      published_at: db.fn.now(),
    });

    const books = await request(app).get("/api/books");
    expect(books.status).toBe(200);
    expect(books.body.data.rows.some((item) => item.id === bookId)).toBe(true);

    const publicChapter = await request(app).get(`/api/chapters/${chapter[0]}`);
    expect(publicChapter.status).toBe(200);
    expect(publicChapter.body.data.chapter.content).toBe(null);
    expect(publicChapter.body.data.chapter.content_url).toBe(null);
    expect(publicChapter.body.data.chapter.requiresPurchase).toBe(true);
  });
});
