const http = require("http");
const request = require("supertest");
const { io: createSocket } = require("socket.io-client");
const app = require("../src/app");
const db = require("../src/config/db");
const {
  attachRealtime,
  emitToAccount,
} = require("../src/modules/messaging/realtime");

async function createVerifiedUser() {
  const suffix = Date.now() + Math.floor(Math.random() * 10000);
  const email = `realtime_${suffix}@example.com`;
  const username = `realtime_${suffix}`;
  const password = "Password123";
  const registered = await request(app)
    .post("/api/auth/register")
    .send({ username, email, channel: "email", password });
  expect(registered.status).toBe(201);
  const verified = await request(app)
    .post("/api/auth/verify-otp")
    .send({ target: email, code: registered.body.data.debugOtp });
  expect(verified.status).toBe(200);
  const login = await request(app)
    .post("/api/auth/login")
    .send({ identifier: email, password, platform: "web" });
  expect(login.status).toBe(200);
  return {
    id: registered.body.data.account.id,
    token: login.body.data.accessToken,
  };
}

describe("Authenticated Socket.IO delivery", () => {
  let server;
  let realtime;
  let port;
  let account;
  let socket;
  let accountId;

  beforeAll(async () => {
    account = await createVerifiedUser();
    accountId = account.id;
    server = http.createServer(app);
    realtime = attachRealtime(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    socket?.disconnect();
    if (realtime) await new Promise((resolve) => realtime.close(resolve));
    if (accountId) await db("accounts").where({ id: accountId }).del();
    await db.destroy();
  });

  it("rejects anonymous clients and emits events only after authentication", async () => {
    const endpoint = `http://127.0.0.1:${port}`;
    const unauthorized = createSocket(endpoint, {
      transports: ["websocket"],
      reconnection: false,
    });
    const authError = await new Promise((resolve, reject) => {
      unauthorized.once("connect_error", resolve);
      unauthorized.once("connect", () =>
        reject(new Error("Socket connected without a token")),
      );
    });
    expect(authError.message).toBe("AUTH_REQUIRED");
    unauthorized.close();

    socket = createSocket(endpoint, {
      auth: { token: account.token },
      transports: ["websocket"],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });

    const event = new Promise((resolve) =>
      socket.once("test:private", resolve),
    );
    emitToAccount(accountId, "test:private", { ok: true });
    await expect(event).resolves.toEqual({ ok: true });
  });
});
