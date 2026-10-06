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
    if (bookIds.length)
      await db("chapter_views").whereIn("book_id", bookIds).del();
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
    const reader = await createVerifiedUser("public_reader");
    accountIds.push(owner.accountId, reader.accountId);

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
      preview_text: "Secret paid content",
      is_free: 0,
      price: "10000.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const previewChapter = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 2,
      title: "Paid chapter with teaser",
      content: "The complete chapter content is much longer than this teaser.",
      preview_text: "The complete chapter content",
      is_free: 0,
      price: "10000.00",
      status: "published",
      published_at: db.fn.now(),
    });

    const books = await request(app).get("/api/books");
    expect(books.status).toBe(200);
    expect(books.body.data.rows.some((item) => item.id === bookId)).toBe(true);

    const chapterList = await request(app).get(
      `/api/books/${bookId}/chapters`,
    );
    expect(chapterList.status).toBe(200);
    expect(chapterList.body.data.chapters[0].preview_text).toBe(null);

    const publicChapter = await request(app).get(`/api/chapters/${chapter[0]}`);
    expect(publicChapter.status).toBe(200);
    expect(publicChapter.body.data.chapter.content).toBe(null);
    expect(publicChapter.body.data.chapter.content_url).toBe(null);
    expect(publicChapter.body.data.chapter.preview_text).toBe(null);
    expect(publicChapter.body.data.chapter.requiresPurchase).toBe(true);

    const loggedInReaderChapter = await request(app)
      .get(`/api/chapters/${chapter[0]}`)
      .set("Authorization", `Bearer ${reader.token}`);
    expect(loggedInReaderChapter.status).toBe(200);
    expect(loggedInReaderChapter.body.data.chapter.content).toBe(null);
    expect(loggedInReaderChapter.body.data.chapter.content_url).toBe(null);
    expect(loggedInReaderChapter.body.data.chapter.preview_text).toBe(null);
    expect(loggedInReaderChapter.body.data.chapter.requiresPurchase).toBe(true);

    const ownerChapter = await request(app)
      .get(`/api/chapters/${chapter[0]}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(ownerChapter.status).toBe(200);
    expect(ownerChapter.body.data.chapter.content).toBe("Secret paid content");
    expect(ownerChapter.body.data.chapter.preview_text).toBe(
      "Secret paid content",
    );

    const chapterWithSafePreview = await request(app).get(
      `/api/chapters/${previewChapter[0]}`,
    );
    expect(chapterWithSafePreview.status).toBe(200);
    expect(chapterWithSafePreview.body.data.chapter.content).toBe(null);
    expect(chapterWithSafePreview.body.data.chapter.preview_text).toBe(
      null,
    );
  });

  it("records valid chapter reads for guests and accounts but not locked chapters", async () => {
    const owner = await createVerifiedUser("view_owner");
    const reader = await createVerifiedUser("view_reader");
    accountIds.push(owner.accountId, reader.accountId);

    const [bookId] = await db("books").insert({
      owner_id: owner.accountId,
      title: `View Count Book ${Date.now()}`,
      slug: `view-count-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);

    const [freeChapterId] = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Free chapter",
      content: "Readable content",
      is_free: 1,
      price: "0.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const [paidChapterId] = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 2,
      title: "Paid chapter",
      content: "Locked content",
      is_free: 0,
      price: "100.00",
      status: "published",
      published_at: db.fn.now(),
    });

    const guestRead = await request(app).post(
      `/api/chapters/${freeChapterId}/view`,
    );
    expect(guestRead.status).toBe(200);
    expect(guestRead.body.data.counted).toBe(true);

    const accountRead = await request(app)
      .post(`/api/chapters/${freeChapterId}/view`)
      .set("Authorization", "Bearer " + reader.token);
    expect(accountRead.status).toBe(200);
    expect(accountRead.body.data.counted).toBe(true);

    const lockedRead = await request(app).post(
      `/api/chapters/${paidChapterId}/view`,
    );
    expect(lockedRead.status).toBe(403);

    const viewRows = await db("chapter_views")
      .where({ book_id: bookId })
      .orderBy("id", "asc");
    expect(viewRows).toHaveLength(2);
    expect(viewRows[0].account_id).toBeNull();
    expect(viewRows[1].account_id).toBe(reader.accountId);

    const book = await db("books").where({ id: bookId }).first();
    const chapter = await db("chapters").where({ id: freeChapterId }).first();
    expect(Number(book.view_count)).toBe(2);
    expect(Number(chapter.view_count)).toBe(2);

    const ownerRead = await request(app)
      .post(`/api/chapters/${freeChapterId}/view`)
      .set("Authorization", "Bearer " + owner.token);
    expect(ownerRead.status).toBe(200);
    expect(ownerRead.body.data.counted).toBe(false);
  });
});
