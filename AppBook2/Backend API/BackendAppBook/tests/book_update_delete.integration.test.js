const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

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

describe("Book and chapter update/delete workflow", () => {
  const accountIds = [];
  const bookIds = [];
  const chapterIds = [];
  const moderationIds = [];

  afterAll(async () => {
    if (moderationIds.length)
      await db("moderation_requests").whereIn("id", moderationIds).del();
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("moderates owner updates, snapshots chapters, and soft-deletes content", async () => {
    const owner = await createUser("edit_owner");
    const other = await createUser("edit_other");
    const admin = await createUser("edit_admin", "admin");
    accountIds.push(owner.accountId, other.accountId, admin.accountId);

    const [bookId] = await db("books").insert({
      owner_id: owner.accountId,
      title: `Editable Book ${Date.now()}`,
      slug: `editable-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);
    await db("book_categories").insert({ book_id: bookId, category_id: 1 });

    const [chapterId] = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Original title",
      content: "Original content",
      preview_text: "Original preview",
      is_free: 1,
      price: "0.00",
      status: "published",
      published_at: db.fn.now(),
    });
    chapterIds.push(chapterId);

    const forbidden = await request(app)
      .patch(`/api/books/${bookId}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ title: "Not allowed" });
    expect(forbidden.status).toBe(403);

    const bookUpdate = await request(app)
      .patch(`/api/books/${bookId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Updated title", description: "Updated description" });
    expect(bookUpdate.status).toBe(202);
    moderationIds.push(bookUpdate.body.data.moderationRequest.id);

    const beforeApprove = await db("books").where({ id: bookId }).first();
    expect(beforeApprove.title).not.toBe("Updated title");

    const approvedBook = await request(app)
      .post(
        `/api/admin/moderation/${bookUpdate.body.data.moderationRequest.id}/approve`,
      )
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ adminNote: "Update approved" });
    expect(approvedBook.status).toBe(200);
    expect((await db("books").where({ id: bookId }).first()).title).toBe(
      "Updated title",
    );

    const chapterUpdate = await request(app)
      .patch(`/api/chapters/${chapterId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Updated chapter", content: "Updated content" });
    expect(chapterUpdate.status).toBe(202);
    moderationIds.push(chapterUpdate.body.data.moderationRequest.id);

    const approvedChapter = await request(app)
      .post(
        `/api/admin/moderation/${chapterUpdate.body.data.moderationRequest.id}/approve`,
      )
      .set("Authorization", `Bearer ${admin.token}`)
      .send();
    expect(approvedChapter.status).toBe(200);
    expect((await db("chapters").where({ id: chapterId }).first()).title).toBe(
      "Updated chapter",
    );
    expect(
      await db("chapter_versions").where({ chapter_id: chapterId }).first(),
    ).toBeTruthy();

    const deleteRequest = await request(app)
      .post(`/api/books/${bookId}/delete-request`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ reason: "Không còn phát hành" });
    expect(deleteRequest.status).toBe(202);
    moderationIds.push(deleteRequest.body.data.moderationRequest.id);
    expect((await db("books").where({ id: bookId }).first()).status).toBe(
      "pending_delete",
    );

    const rejected = await request(app)
      .post(
        `/api/admin/moderation/${deleteRequest.body.data.moderationRequest.id}/reject`,
      )
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ adminNote: "Giữ lại nội dung" });
    expect(rejected.status).toBe(200);
    expect((await db("books").where({ id: bookId }).first()).status).toBe(
      "published",
    );
  });
});
