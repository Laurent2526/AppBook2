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

describe("Ratings and comments", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("updates a rating and protects comment ownership with soft delete", async () => {
    const owner = await createVerifiedUser("interaction_owner");
    const reader = await createVerifiedUser("interaction_reader");
    const otherReader = await createVerifiedUser("interaction_other");
    accountIds.push(owner.accountId, reader.accountId, otherReader.accountId);

    const [bookId] = await db("books").insert({
      owner_id: owner.accountId,
      title: `Interaction Book ${Date.now()}`,
      slug: `interaction-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);

    const [chapterId] = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Visible chapter",
      content: "Content",
      preview_text: "Preview",
      is_free: 1,
      price: "0.00",
      status: "published",
      published_at: db.fn.now(),
    });

    const firstRating = await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ score: 4 });
    expect(firstRating.status).toBe(201);

    const updatedRating = await request(app)
      .post(`/api/books/${bookId}/ratings`)
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ score: 5 });
    expect(updatedRating.status).toBe(200);

    const aggregate = await db("books")
      .select("rating_count", "rating_avg")
      .where({ id: bookId })
      .first();
    expect(aggregate.rating_count).toBe(1);
    expect(Number(aggregate.rating_avg)).toBe(5);

    const myRatings = await request(app)
      .get("/api/me/ratings")
      .set("Authorization", `Bearer ${reader.token}`);
    expect(myRatings.status).toBe(200);
    expect(myRatings.body.data.items).toContainEqual(
      expect.objectContaining({
        book_id: bookId,
        book_title: expect.any(String),
        score: 5,
      }),
    );

    const comment = await request(app)
      .post(`/api/books/${bookId}/comments`)
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ chapterId, content: "Useful chapter" });
    expect(comment.status).toBe(201);

    const commentId = comment.body.data.comment.id;
    const comments = await request(app).get(`/api/books/${bookId}/comments`);
    expect(comments.status).toBe(200);
    expect(comments.body.data.items.some((item) => item.id === commentId)).toBe(
      true,
    );
    expect(
      comments.body.data.items[0].account_name ||
        comments.body.data.items[0].account_username,
    ).toBeTruthy();

    const forbiddenPatch = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${otherReader.token}`)
      .send({ content: "Changed by another user" });
    expect(forbiddenPatch.status).toBe(403);

    const patched = await request(app)
      .patch(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ content: "Updated chapter comment" });
    expect(patched.status).toBe(200);

    const removed = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set("Authorization", `Bearer ${reader.token}`);
    expect(removed.status).toBe(200);

    const afterDelete = await request(app).get(`/api/books/${bookId}/comments`);
    expect(afterDelete.status).toBe(200);
    expect(
      afterDelete.body.data.items.some((item) => item.id === commentId),
    ).toBe(false);

    const stored = await db("comments").where({ id: commentId }).first();
    expect(stored.status).toBe("deleted");
    expect(stored.deleted_at).not.toBeNull();
  });
});
