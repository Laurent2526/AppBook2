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

describe("Admin accounts, books and author statistics", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("searches and manages accounts while revoking sessions and preserving published books", async () => {
    const admin = await createUser("manage_admin", "admin");
    const user = await createUser("manage_user");
    const author = await createUser("manage_author");
    accountIds.push(admin.accountId, user.accountId, author.accountId);

    const forbidden = await request(app)
      .get("/api/admin/accounts")
      .set("Authorization", `Bearer ${user.token}`);
    expect(forbidden.status).toBe(403);

    const search = await request(app)
      .get("/api/admin/accounts")
      .query({ search: "manage_user", page: 1, limit: 10 })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(search.status).toBe(200);
    expect(search.body.data.rows.some((row) => row.id === user.accountId)).toBe(
      true,
    );
    expect(search.body.data.rows[0].password_hash).toBeUndefined();

    const [bookId] = await db("books").insert({
      owner_id: author.accountId,
      title: `Account guard book ${Date.now()}`,
      slug: `account-guard-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
    });
    bookIds.push(bookId);

    const blockedDelete = await request(app)
      .delete(`/api/admin/accounts/${author.accountId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(blockedDelete.status).toBe(409);

    const locked = await request(app)
      .patch(`/api/admin/accounts/${user.accountId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "locked", reason: "Vi phạm quy định" });
    expect(locked.status).toBe(200);
    expect(locked.body.data.status).toBe("locked");
    const revokedSession = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${user.token}`);
    expect(revokedSession.status).toBe(401);

    const unlocked = await request(app)
      .patch(`/api/admin/accounts/${user.accountId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "active" });
    expect(unlocked.status).toBe(200);

    const deleted = await request(app)
      .delete(`/api/admin/accounts/${user.accountId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(deleted.status).toBe(200);
    const anonymized = await db("accounts")
      .where({ id: user.accountId })
      .first();
    expect(anonymized.status).toBe("deleted");
    expect(anonymized.email).toBe(`deleted_${user.accountId}@invalid.local`);
    expect(anonymized.phone).toBeNull();
    expect(anonymized.deleted_at).toBeTruthy();
  });

  it("manages all books and returns owner-only book statistics", async () => {
    const admin = await createUser("book_admin", "admin");
    const author = await createUser("book_author");
    const other = await createUser("book_other");
    accountIds.push(admin.accountId, author.accountId, other.accountId);

    const [bookId] = await db("books").insert({
      owner_id: author.accountId,
      title: `Managed book ${Date.now()}`,
      slug: `managed-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      view_count: 27,
      purchase_count: 4,
      total_revenue: "12000.00",
    });
    bookIds.push(bookId);

    const stats = await request(app)
      .get(`/api/me/books/${bookId}/statistics`)
      .set("Authorization", `Bearer ${author.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data.statistics).toMatchObject({
      views: 27,
      purchases: 4,
      revenue: "12000.00",
    });

    const otherStats = await request(app)
      .get(`/api/me/books/${bookId}/statistics`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(otherStats.status).toBe(404);

    const listed = await request(app)
      .get("/api/admin/books")
      .query({ search: "Managed book" })
      .set("Authorization", `Bearer ${admin.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.rows[0].id).toBe(bookId);

    const edited = await request(app)
      .patch(`/api/admin/books/${bookId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ title: "Edited by admin" });
    expect(edited.status).toBe(200);
    expect((await db("books").where({ id: bookId }).first()).title).toBe(
      "Edited by admin",
    );

    const hidden = await request(app)
      .patch(`/api/admin/books/${bookId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "hidden" });
    expect(hidden.status).toBe(200);
    expect((await db("books").where({ id: bookId }).first()).status).toBe(
      "hidden",
    );

    const deleted = await request(app)
      .delete(`/api/admin/books/${bookId}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(deleted.status).toBe(200);
    const softDeleted = await db("books").where({ id: bookId }).first();
    expect(softDeleted.status).toBe("deleted");
    expect(softDeleted.deleted_at).toBeTruthy();
  });
});
