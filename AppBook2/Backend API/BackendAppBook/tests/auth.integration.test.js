const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

describe("Auth registration and OTP", () => {
  const createdAccountIds = [];

  afterAll(async () => {
    if (createdAccountIds.length > 0) {
      await db("accounts").whereIn("id", createdAccountIds).del();
    }
    await db.destroy();
  });

  it("rejects invalid registration data", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "ab",
      email: "invalid-test@example.com",
      channel: "email",
      password: "weak",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("registers an account and verifies its OTP", async () => {
    const suffix = Date.now();
    const email = `auth_test_${suffix}@example.com`;
    const username = `auth_test_${suffix}`;

    const registered = await request(app).post("/api/auth/register").send({
      username,
      email,
      channel: "email",
      password: "Password123",
    });

    expect(registered.status).toBe(201);
    expect(registered.body.data.debugOtp).toMatch(/^\d{6}$/);
    createdAccountIds.push(registered.body.data.account.id);

    const verified = await request(app).post("/api/auth/verify-otp").send({
      target: email,
      code: registered.body.data.debugOtp,
    });

    expect(verified.status).toBe(200);
    expect(verified.body.data.account.status).toBe("active");
  });

  it("creates a session and rotates refresh tokens", async () => {
    const suffix = Date.now();
    const email = `login_test_${suffix}@example.com`;
    const username = `login_test_${suffix}`;

    const registered = await request(app).post("/api/auth/register").send({
      username,
      email,
      channel: "email",
      password: "Password123",
    });
    const accountId = registered.body.data.account.id;
    createdAccountIds.push(accountId);

    await request(app).post("/api/auth/verify-otp").send({
      target: email,
      code: registered.body.data.debugOtp,
    });

    const loggedIn = await request(app).post("/api/auth/login").send({
      identifier: email,
      password: "Password123",
      platform: "web",
    });
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.data.accessToken).toBeTruthy();

    const me = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${loggedIn.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.account.email).toBe(email);

    const refreshed = await request(app).post("/api/auth/refresh").send({
      refreshToken: loggedIn.body.data.refreshToken,
    });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toBe(
      loggedIn.body.data.refreshToken,
    );

    const revokedAccess = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${loggedIn.body.data.accessToken}`);
    expect(revokedAccess.status).toBe(401);

    const currentAccess = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${refreshed.body.data.accessToken}`);
    expect(currentAccess.status).toBe(200);

    const reused = await request(app).post("/api/auth/refresh").send({
      refreshToken: loggedIn.body.data.refreshToken,
    });
    expect(reused.status).toBe(401);
  });
});
