const crypto = require("crypto");
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

function signWebhook(payload) {
  const secret = process.env.TOPUP_WEBHOOK_SECRET || "dev-topup-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

describe("Topup webhook flow", () => {
  const accountIds = [];

  afterAll(async () => {
    if (accountIds.length) {
      await db("accounts").whereIn("id", accountIds).del();
    }
    await db.destroy();
  });

  it("creates a topup order and confirms it through webhook idempotently", async () => {
    const user = await createVerifiedUser("topup_user");
    accountIds.push(user.accountId);

    const created = await request(app)
      .post("/api/topups")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ amount: "100000", paymentMethod: "vnpay" });
    expect(created.status).toBe(201);
    expect(created.body.data.order.status).toBe("pending");

    const order = created.body.data.order;
    const payload = {
      code: order.code,
      amount: order.amount,
      paymentMethod: order.payment_method,
      gatewayTxnId: `VNP-${Date.now()}`,
      status: "success",
      paidAt: new Date().toISOString(),
    };

    const signature = signWebhook(payload);
    const webhook = await request(app)
      .post(`/api/topups/${order.payment_method}/webhook`)
      .set("x-signature", signature)
      .send(payload);
    expect(webhook.status).toBe(200);
    expect(webhook.body.data.order.status).toBe("success");

    const duplicate = await request(app)
      .post(`/api/topups/${order.payment_method}/webhook`)
      .set("x-signature", signature)
      .send(payload);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data.order.status).toBe("success");

    const wallet = await db("wallets")
      .where({ account_id: user.accountId })
      .first();
    expect(String(wallet.balance)).toBe("100000.00");
    expect(String(wallet.total_topup)).toBe("100000.00");

    const entries = await db("wallet_entries").where({
      account_id: user.accountId,
      reason: "topup",
    });
    expect(entries.length).toBeGreaterThan(0);

    const transaction = await db("transactions")
      .where({ buyer_id: user.accountId, transaction_type: "topup" })
      .first();
    expect(transaction).toBeTruthy();
    expect(transaction.status).toBe("success");

    const badRequest = await request(app)
      .post(`/api/topups/${order.payment_method}/webhook`)
      .set("x-signature", "bad-signature")
      .send(payload);
    expect(badRequest.status).toBe(401);
  });
});
