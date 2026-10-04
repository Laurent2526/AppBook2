const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

async function createUser(prefix) {
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

describe("Messages and notifications", () => {
  const accountIds = [];

  afterAll(async () => {
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("persists direct messages, enforces membership and blocks, and reads notifications", async () => {
    const alice = await createUser("message_alice");
    const bob = await createUser("message_bob");
    const stranger = await createUser("message_stranger");
    accountIds.push(alice.accountId, bob.accountId, stranger.accountId);

    const created = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ receiverId: bob.accountId });
    expect(created.status).toBe(201);
    expect(created.body.data.conversation.user_a_id).toBe(
      Math.min(alice.accountId, bob.accountId),
    );

    const repeated = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ receiverId: bob.accountId });
    expect(repeated.status).toBe(200);
    expect(repeated.body.data.conversation.id).toBe(
      created.body.data.conversation.id,
    );

    const conversationId = created.body.data.conversation.id;
    const conversations = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${alice.token}`);
    expect(conversations.status).toBe(200);
    expect(
      conversations.body.data.items.some((item) => item.id === conversationId),
    ).toBe(true);

    const sent = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ content: "Hello Bob", messageType: "text" });
    expect(sent.status).toBe(201);

    const strangerMessage = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ content: "Intrusion" });
    expect(strangerMessage.status).toBe(403);

    const messages = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${bob.token}`);
    expect(messages.status).toBe(200);
    expect(messages.body.data.items[0].content).toBe("Hello Bob");

    const readMessage = await request(app)
      .patch(`/api/messages/${sent.body.data.message.id}/read`)
      .set("Authorization", `Bearer ${bob.token}`);
    expect(readMessage.status).toBe(200);

    const blocked = await request(app)
      .post(`/api/users/${bob.accountId}/block`)
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ reason: "Spam" });
    expect(blocked.status).toBe(201);

    const blockedMessage = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ content: "Cannot send" });
    expect(blockedMessage.status).toBe(403);

    const unblocked = await request(app)
      .delete(`/api/users/${bob.accountId}/block`)
      .set("Authorization", `Bearer ${alice.token}`);
    expect(unblocked.status).toBe(200);

    const notification = await db("notifications").insert({
      account_id: alice.accountId,
      type: "social",
      title: "New follower",
      content: "Bob followed your book",
      ref_type: "none",
    });
    const notificationId = notification[0];

    const unread = await request(app)
      .get("/api/me/notifications/unread-count")
      .set("Authorization", `Bearer ${alice.token}`);
    expect(unread.status).toBe(200);
    expect(unread.body.data.count).toBeGreaterThanOrEqual(1);

    const notifications = await request(app)
      .get("/api/me/notifications")
      .set("Authorization", `Bearer ${alice.token}`);
    expect(notifications.status).toBe(200);
    expect(
      notifications.body.data.items.some((item) => item.id === notificationId),
    ).toBe(true);

    const read = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${alice.token}`);
    expect(read.status).toBe(200);

    const afterRead = await request(app)
      .get("/api/me/notifications/unread-count")
      .set("Authorization", `Bearer ${alice.token}`);
    expect(afterRead.body.data.count).toBe(0);
  });

  it("registers an Expo push token on the current device session", async () => {
    const user = await createUser("push_token_user");
    accountIds.push(user.accountId);
    const token = "ExponentPushToken[local-test-device]";

    const registered = await request(app)
      .put("/api/me/push-token")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ token });
    expect(registered.status).toBe(200);

    const session = await db("user_sessions")
      .where({ account_id: user.accountId })
      .whereNull("revoked_at")
      .first();
    expect(session.fcm_token).toBe(token);

    const invalid = await request(app)
      .put("/api/me/push-token")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ token: "not-a-push-token" });
    expect(invalid.status).toBe(400);
  });
});
