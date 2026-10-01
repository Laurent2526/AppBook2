const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

async function createUser(prefix, role = "user") {
  const suffix = Date.now() + Math.floor(Math.random() * 1000);
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

  const accountId = registered.body.data.account.id;
  if (role !== "user")
    await db("accounts").where({ id: accountId }).update({ role });

  const loggedIn = await request(app).post("/api/auth/login").send({
    identifier: email,
    password,
    platform: "web",
  });
  expect(loggedIn.status).toBe(200);

  return { accountId, token: loggedIn.body.data.accessToken };
}

describe("Content moderation", () => {
  const accountIds = [];
  const bookIds = [];
  const requestIds = [];

  afterAll(async () => {
    if (requestIds.length)
      await db("audit_logs").whereIn("target_id", bookIds).del();
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("creates moderation requests atomically with new books", async () => {
    const owner = await createUser("moderation_owner");
    accountIds.push(owner.accountId);

    const bookResponse = await request(app)
      .post("/api/books")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: `Moderation Book ${Date.now()}`,
        categoryIds: [1],
        language: "vi",
        isMature: false,
        writingStatus: "ongoing",
        freePreviewChapters: 1,
      });

    expect(bookResponse.status).toBe(201);
    const bookId = bookResponse.body.data.book.id;
    bookIds.push(bookId);

    const moderation = await db("moderation_requests")
      .where({
        target_type: "book",
        target_id: bookId,
        request_type: "book_publish",
      })
      .first();
    expect(moderation).toBeTruthy();
    expect(moderation.status).toBe("pending");
    requestIds.push(moderation.id);
  });

  it("limits queue and decisions to admin roles", async () => {
    const owner = await createUser("moderation_user");
    const admin = await createUser("moderation_admin", "admin");
    accountIds.push(owner.accountId, admin.accountId);

    const forbidden = await request(app)
      .get("/api/admin/moderation")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(forbidden.status).toBe(403);

    const bookResponse = await request(app)
      .post("/api/books")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: `Approve Book ${Date.now()}`,
        categoryIds: [1],
        language: "vi",
        isMature: false,
        writingStatus: "ongoing",
        freePreviewChapters: 0,
      });
    expect(bookResponse.status).toBe(201);

    const bookId = bookResponse.body.data.book.id;
    bookIds.push(bookId);
    const chapterResponse = await request(app)
      .post(`/api/books/${bookId}/chapters`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        chapterNumber: 1,
        title: "Chương mở đầu",
        content: "Nội dung chương mở đầu",
        isFree: true,
        price: "0.00",
      });
    expect(chapterResponse.status).toBe(201);

    const moderation = await db("moderation_requests")
      .where({ target_type: "book", target_id: bookId })
      .first();
    requestIds.push(moderation.id);

    const queue = await request(app)
      .get("/api/admin/moderation")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data.rows.some((row) => row.id === moderation.id)).toBe(
      true,
    );

    const approved = await request(app)
      .post(`/api/admin/moderation/${moderation.id}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ adminNote: "Đạt yêu cầu" });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe("published");

    const book = await db("books").where({ id: bookId }).first();
    const chapter = await db("chapters")
      .where({ id: chapterResponse.body.data.chapter.id })
      .first();
    const chapterRequest = await db("moderation_requests")
      .where({
        target_type: "chapter",
        target_id: chapter.id,
        request_type: "chapter_publish",
      })
      .first();
    const approvedRequest = await db("moderation_requests")
      .where({ id: moderation.id })
      .first();
    const audit = await db("audit_logs")
      .where({
        target_type: "book",
        target_id: bookId,
        action: "content.approve",
      })
      .first();
    expect(chapter.status).toBe("published");
    expect(chapterRequest.status).toBe("approved");
    expect(book.status).toBe("published");
    expect(approvedRequest.status).toBe("approved");
    expect(audit).toBeTruthy();

    const duplicateDecision = await request(app)
      .post(`/api/admin/moderation/${moderation.id}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});
    expect(duplicateDecision.status).toBe(409);
  });

  it("rejects pending content and preserves the reason", async () => {
    const owner = await createUser("reject_owner");
    const admin = await createUser("reject_admin", "super_admin");
    accountIds.push(owner.accountId, admin.accountId);

    const bookResponse = await request(app)
      .post("/api/books")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: `Reject Book ${Date.now()}`,
        categoryIds: [1],
        language: "vi",
        isMature: false,
        writingStatus: "ongoing",
        freePreviewChapters: 0,
      });
    expect(bookResponse.status).toBe(201);

    const bookId = bookResponse.body.data.book.id;
    bookIds.push(bookId);
    const moderation = await db("moderation_requests")
      .where({ target_type: "book", target_id: bookId })
      .first();
    requestIds.push(moderation.id);

    const rejected = await request(app)
      .post(`/api/admin/moderation/${moderation.id}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ adminNote: "Thiếu thông tin mô tả" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe("rejected");

    const book = await db("books").where({ id: bookId }).first();
    expect(book.status).toBe("rejected");
    expect(book.reject_reason).toBe("Thiếu thông tin mô tả");
  });
});
