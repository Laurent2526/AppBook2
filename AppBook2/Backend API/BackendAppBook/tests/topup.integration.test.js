const crypto = require("crypto");
const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");
const env = require("../src/config/env");

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
  const bookIds = [];
  const platformFeeTransactionIds = [];

  afterAll(async () => {
    if (platformFeeTransactionIds.length) {
      await db.transaction(async (trx) => {
        const entries = await trx("wallet_entries")
          .whereIn("transaction_id", platformFeeTransactionIds)
          .where({ reason: "platform_fee" })
          .forUpdate();
        const totals = new Map();
        for (const entry of entries) {
          totals.set(
            entry.account_id,
            (totals.get(entry.account_id) || 0) + Number(entry.amount),
          );
        }
        for (const [accountId, amount] of totals) {
          await trx("wallets")
            .where({ account_id: accountId })
            .update({
              balance: trx.raw("balance - ?", [amount]),
              total_earned: trx.raw("total_earned - ?", [amount]),
              version: trx.raw("version + 1"),
            });
        }
        if (entries.length) {
          await trx("wallet_entries")
            .whereIn(
              "id",
              entries.map((entry) => entry.id),
            )
            .delete();
        }
      });
    }
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
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

  it("credits a selected demo amount once and records its wallet ledger", async () => {
    const user = await createVerifiedUser("demo_topup_user");
    const author = await createVerifiedUser("demo_topup_author");
    accountIds.push(user.accountId, author.accountId);

    const bookInsert = await db("books").insert({
      owner_id: author.accountId,
      title: `Demo purchase book ${Date.now()}`,
      slug: `demo-purchase-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    const bookId = bookInsert[0];
    bookIds.push(bookId);
    await db("book_categories").insert({ book_id: bookId, category_id: 1 });

    const chapterInsert = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Demo paid chapter",
      content: "Paid content unlocked with demo wallet funds.",
      is_free: 0,
      price: "10000.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const chapterId = chapterInsert[0];

    const response = await request(app)
      .post("/api/topups/demo")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ amount: "100000" });

    expect(response.status).toBe(201);
    expect(response.body.data.amount).toBe("100000.00");
    expect(response.body.data.balance).toBe("100000.00");

    const wallet = await db("wallets")
      .where({ account_id: user.accountId })
      .first();
    expect(String(wallet.balance)).toBe("100000.00");

    const transaction = await db("transactions")
      .where({
        id: response.body.data.transactionId,
        transaction_type: "topup",
      })
      .first();
    expect(transaction.status).toBe("success");
    expect(transaction.payment_method).toBe("system");

    const ledger = await db("wallet_entries")
      .where({ transaction_id: transaction.id, reason: "topup" })
      .first();
    expect(String(ledger.balance_after)).toBe("100000.00");

    const invalidAmount = await request(app)
      .post("/api/topups/demo")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ amount: "12345" });
    expect(invalidAmount.status).toBe(400);
    expect(
      String(
        (await db("wallets").where({ account_id: user.accountId }).first())
          .balance,
      ),
    ).toBe("100000.00");

    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      const productionRequest = await request(app)
        .post("/api/topups/demo")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ amount: "50000" });
      expect(productionRequest.status).toBe(404);
    } finally {
      env.NODE_ENV = originalNodeEnv;
    }

    const purchase = await request(app)
      .post(`/api/chapters/${chapterId}/purchase`)
      .set("Authorization", `Bearer ${user.token}`)
      .send();
    expect(purchase.status).toBe(201);
    platformFeeTransactionIds.push(purchase.body.data.transactionId);

    const buyerWallet = await db("wallets")
      .where({ account_id: user.accountId })
      .first();
    const authorWallet = await db("wallets")
      .where({ account_id: author.accountId })
      .first();
    expect(String(buyerWallet.balance)).toBe("90000.00");
    expect(String(authorWallet.balance)).toBe("9500.00");

    const unlockedChapter = await request(app)
      .get(`/api/chapters/${chapterId}`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(unlockedChapter.body.data.chapter.content).toBe(
      "Paid content unlocked with demo wallet funds.",
    );
  });
});
