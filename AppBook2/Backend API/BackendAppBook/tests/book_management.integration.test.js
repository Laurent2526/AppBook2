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

describe("My books management API", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("returns books and summary for the current author", async () => {
    const author = await createUser("my_books_owner");
    const other = await createUser("my_books_other");
    accountIds.push(author.accountId, other.accountId);

    const bookPayloads = [
      {
        owner_id: author.accountId,
        title: `My Book Pending ${Date.now()}`,
        slug: `my-book-pending-${Date.now()}`,
        status: "pending",
        writing_status: "ongoing",
        language: "vi",
      },
      {
        owner_id: author.accountId,
        title: `My Book Published ${Date.now()}`,
        slug: `my-book-published-${Date.now()}`,
        status: "published",
        writing_status: "completed",
        language: "vi",
      },
      {
        owner_id: author.accountId,
        title: `My Book Rejected ${Date.now()}`,
        slug: `my-book-rejected-${Date.now()}`,
        status: "rejected",
        writing_status: "paused",
        language: "vi",
      },
      {
        owner_id: other.accountId,
        title: `Other Book ${Date.now()}`,
        slug: `other-book-${Date.now()}`,
        status: "published",
        writing_status: "ongoing",
        language: "vi",
      },
    ];

    for (const payload of bookPayloads) {
      const [id] = await db("books").insert(payload);
      bookIds.push(id);
      await db("book_categories").insert({ book_id: id, category_id: 1 });
    }

    const response = await request(app)
      .get("/api/me/books")
      .set("Authorization", `Bearer ${author.token}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rows.length).toBe(3);
    expect(
      response.body.data.rows.every(
        (book) => book.owner_id === author.accountId,
      ),
    ).toBe(true);
    expect(response.body.data.summary.pending).toBe(1);
    expect(response.body.data.summary.published).toBe(1);
    expect(response.body.data.summary.rejected).toBe(1);
    expect(response.body.data.summary.total).toBe(3);
  });
});
