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

  afterAll(async () => {
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

    await db("wallets")
      .where({ account_id: buyer.accountId })
      .update({ balance: "10000.00" });

    const purchased = await request(app)
      .post(`/api/chapters/${chapterId}/purchase`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send();
    expect(purchased.status).toBe(201);
    expect(purchased.body.data.status).toBe("success");
    expect(purchased.body.data.transactionId).toBeTruthy();

    const buyerWallet = await db("wallets")
      .where({ account_id: buyer.accountId })
      .first();
    const ownerWallet = await db("wallets")
      .where({ account_id: owner.accountId })
      .first();
    expect(String(buyerWallet.balance)).toBe("0.00");
    expect(String(ownerWallet.balance)).toBe("9500.00");

    const entries = await db("wallet_entries").where({
      transaction_id: purchased.body.data.transactionId,
    });
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.reason).sort()).toEqual([
      "earning",
      "purchase",
    ]);

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
