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

describe("Wallet and chapter purchase", () => {
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
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("purchases through the stored procedure and updates wallet ledger", async () => {
    const owner = await createVerifiedUser("purchase_owner");
    const buyer = await createVerifiedUser("purchase_buyer");
    accountIds.push(owner.accountId, buyer.accountId);

    const bookInsert = await db("books").insert({
      owner_id: owner.accountId,
      title: `Purchase Book ${Date.now()}`,
      slug: `purchase-book-${Date.now()}`,
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
      title: "Paid chapter",
      content: "Purchased chapter secret",
      preview_text: "Purchased preview",
      is_free: 0,
      price: "10000.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const chapterId = chapterInsert[0];

    const configuredAdmin = await db("system_settings")
      .where({ setting_key: "platform_admin_account_id" })
      .first();
    const configuredAdminId = configuredAdmin
      ? Number(configuredAdmin.setting_value)
      : null;
    const configuredAdminAccount = configuredAdminId
      ? await db("accounts")
          .where({
            id: configuredAdminId,
            status: "active",
          })
          .whereIn("role", ["admin", "super_admin"])
          .whereNull("deleted_at")
          .first()
      : null;
    const platformAdmin =
      configuredAdminAccount ||
      (await db("accounts")
        .where({ status: "active" })
        .whereIn("role", ["admin", "super_admin"])
        .whereNull("deleted_at")
        .orderByRaw(
          "CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, id ASC",
        )
        .first());
    expect(platformAdmin).toBeTruthy();
    const adminWalletBefore = await db("wallets")
      .where({ account_id: platformAdmin.id })
      .first();
    expect(adminWalletBefore).toBeTruthy();

    await db("wallets")
      .where({ account_id: buyer.accountId })
      .update({ balance: "10000.00" });

    const lockedChapter = await request(app)
      .get(`/api/chapters/${chapterId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(lockedChapter.status).toBe(200);
    expect(lockedChapter.body.data.chapter.content).toBe(null);
    expect(lockedChapter.body.data.chapter.requiresPurchase).toBe(true);

    const publicChapters = await request(app).get(
      `/api/books/${bookId}/chapters`,
    );
    expect(publicChapters.status).toBe(200);
    expect(publicChapters.body.data.chapters[0]).not.toHaveProperty("content");

    const purchased = await request(app)
      .post(`/api/chapters/${chapterId}/purchase`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send();
    expect(purchased.status).toBe(201);
    expect(purchased.body.data.status).toBe("success");
    expect(purchased.body.data.transactionId).toBeTruthy();
    platformFeeTransactionIds.push(purchased.body.data.transactionId);

    const buyerWallet = await db("wallets")
      .where({ account_id: buyer.accountId })
      .first();
    const ownerWallet = await db("wallets")
      .where({ account_id: owner.accountId })
      .first();
    const platformAdminWallet = await db("wallets")
      .where({ account_id: platformAdmin.id })
      .first();
    expect(String(buyerWallet.balance)).toBe("0.00");
    expect(String(ownerWallet.balance)).toBe("9500.00");
    expect(String(platformAdminWallet.balance)).toBe(
      (Number(adminWalletBefore.balance) + 500).toFixed(2),
    );

    const entries = await db("wallet_entries").where({
      transaction_id: purchased.body.data.transactionId,
    });
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.reason).sort()).toEqual([
      "earning",
      "platform_fee",
      "purchase",
    ]);
    const adminFeeEntry = entries.find(
      (entry) => entry.reason === "platform_fee",
    );
    expect(Number(adminFeeEntry.account_id)).toBe(Number(platformAdmin.id));
    expect(String(adminFeeEntry.amount)).toBe("500.00");

    const purchaseTransaction = await db("transactions")
      .where({ id: purchased.body.data.transactionId })
      .first();
    expect(String(purchaseTransaction.amount)).toBe("10000.00");
    expect(String(purchaseTransaction.platform_fee)).toBe("500.00");
    expect(String(purchaseTransaction.seller_amount)).toBe("9500.00");

    const entitlement = await db("purchases")
      .where({ account_id: buyer.accountId, chapter_id: chapterId })
      .first();
    expect(entitlement).toBeTruthy();

    const transaction = await request(app)
      .get(`/api/transactions/${purchased.body.data.transactionId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(transaction.status).toBe(200);
    expect(transaction.body.data.transaction.transaction_type).toBe("purchase");

    const fullChapter = await request(app)
      .get(`/api/chapters/${chapterId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(fullChapter.status).toBe(200);
    expect(fullChapter.body.data.chapter.content).toBe(
      "Purchased chapter secret",
    );

    const anonymousChapter = await request(app).get(
      `/api/chapters/${chapterId}`,
    );
    expect(anonymousChapter.status).toBe(200);
    expect(anonymousChapter.body.data.chapter.content).toBe(null);

    const purchases = await request(app)
      .get("/api/me/purchases")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(purchases.status).toBe(200);
    expect(
      purchases.body.data.rows.some((row) => row.chapter_id === chapterId),
    ).toBe(true);
  });

  it("maps purchase business errors and does not change balances", async () => {
    const owner = await createVerifiedUser("error_owner");
    const buyer = await createVerifiedUser("error_buyer");
    const poorBuyer = await createVerifiedUser("poor_buyer");
    accountIds.push(owner.accountId, buyer.accountId, poorBuyer.accountId);

    const bookInsert = await db("books").insert({
      owner_id: owner.accountId,
      title: `Error Book ${Date.now()}`,
      slug: `error-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    const bookId = bookInsert[0];
    bookIds.push(bookId);
    await db("book_categories").insert({ book_id: bookId, category_id: 1 });

    const paidChapter = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 1,
      title: "Paid chapter",
      content: "Content",
      is_free: 0,
      price: "10000.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const freeChapter = await db("chapters").insert({
      book_id: bookId,
      chapter_number: 2,
      title: "Free chapter",
      content: "Free content",
      is_free: 1,
      price: "0.00",
      status: "published",
      published_at: db.fn.now(),
    });

    await db("wallets")
      .where({ account_id: buyer.accountId })
      .update({ balance: "10000.00" });

    const insufficient = await request(app)
      .post(`/api/chapters/${paidChapter[0]}/purchase`)
      .set("Authorization", `Bearer ${poorBuyer.token}`)
      .send();
    expect(insufficient.status).toBe(402);
    expect(insufficient.body.error.code).toBe("INSUFFICIENT_BALANCE");

    const ownerPurchase = await request(app)
      .post(`/api/chapters/${paidChapter[0]}/purchase`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send();
    expect(ownerPurchase.status).toBe(403);

    const freePurchase = await request(app)
      .post(`/api/chapters/${freeChapter[0]}/purchase`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send();
    expect(freePurchase.status).toBe(409);
    expect(freePurchase.body.error.code).toBe("FREE_CHAPTER");

    const missing = await request(app)
      .post("/api/chapters/999999999/purchase")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send();
    expect(missing.status).toBe(404);

    const successful = await request(app)
      .post(`/api/chapters/${paidChapter[0]}/purchase`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send();
    expect(successful.status).toBe(201);
    platformFeeTransactionIds.push(successful.body.data.transactionId);

    const duplicate = await request(app)
      .post(`/api/chapters/${paidChapter[0]}/purchase`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send();
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("ALREADY_PURCHASED");

    const buyerWallet = await db("wallets")
      .where({ account_id: buyer.accountId })
      .first();
    const poorWallet = await db("wallets")
      .where({ account_id: poorBuyer.accountId })
      .first();
    expect(String(buyerWallet.balance)).toBe("0.00");
    expect(String(poorWallet.balance)).toBe("0.00");
  });
});
