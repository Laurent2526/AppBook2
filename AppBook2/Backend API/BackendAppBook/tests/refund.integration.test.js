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

describe("Refund workflow", () => {
  const accountIds = [];
  const bookIds = [];

  afterAll(async () => {
    if (bookIds.length) {
      await db("books").whereIn("id", bookIds).del();
    }
    if (accountIds.length) {
      await db("accounts").whereIn("id", accountIds).del();
    }
    await db.destroy();
  });

  it("creates a refund request and approves it with wallet and ledger updates", async () => {
    const owner = await createVerifiedUser("refund_owner");
    const buyer = await createVerifiedUser("refund_buyer");
    accountIds.push(owner.accountId, buyer.accountId);

    const bookInsert = await db("books").insert({
      owner_id: owner.accountId,
      title: `Refund Book ${Date.now()}`,
      slug: `refund-book-${Date.now()}`,
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
      title: "Refund chapter",
      content: "Secret refund content",
      preview_text: "Preview",
      is_free: 0,
      price: "10000.00",
      status: "published",
      published_at: db.fn.now(),
    });
    const chapterId = chapterInsert[0];

    await db("wallets")
      .where({ account_id: buyer.accountId })
      .update({ balance: "10000.00" });

    const purchase = await request(app)
      .post(`/api/chapters/${chapterId}/purchase`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send();
    expect(purchase.status).toBe(201);

    const created = await request(app)
      .post("/api/me/refunds")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        transactionId: purchase.body.data.transactionId,
        chapterId,
        reason: "display_error",
        description: "Nội dung bị lỗi hiển thị",
        evidenceUrls: ["https://example.com/refund-1.png"],
      });
    expect(created.status).toBe(201);
    expect(created.body.data.refund.status).toBe("pending");

    const adminUser = await createVerifiedUser("refund_admin");
    accountIds.push(adminUser.accountId);
    await db("accounts")
      .where({ id: adminUser.accountId })
      .update({ role: "admin" });

    const listAdmin = await request(app)
      .get("/api/admin/refunds")
      .set("Authorization", `Bearer ${adminUser.token}`);
    expect(listAdmin.status).toBe(200);
    expect(listAdmin.body.data.items.length).toBeGreaterThan(0);

    const approved = await request(app)
      .post(`/api/admin/refunds/${created.body.data.refund.id}/approve`)
      .set("Authorization", `Bearer ${adminUser.token}`)
      .send({ adminNote: "Duyệt hoàn tiền theo khiếu nại" });
    expect(approved.status).toBe(200);
    expect(approved.body.data.refund.status).toBe("approved");

    const buyerWalletAfter = await db("wallets")
      .where({ account_id: buyer.accountId })
      .first();
    const sellerWalletAfter = await db("wallets")
      .where({ account_id: owner.accountId })
      .first();
    expect(String(buyerWalletAfter.balance)).toBe("10000.00");
    expect(String(sellerWalletAfter.balance)).toBe("0.00");

    const refundEntries = await db("wallet_entries").where({
      account_id: buyer.accountId,
      reason: "refund_in",
    });
    expect(refundEntries.length).toBeGreaterThan(0);

    const refundedTx = await db("transactions")
      .where({ id: approved.body.data.refund.transactionId })
      .first();
    expect(refundedTx.status).toBe("refunded");

    const purchaseAfter = await db("purchases")
      .where({ account_id: buyer.accountId, chapter_id: chapterId })
      .first();
    expect(Number(purchaseAfter.is_revoked)).toBe(1);
  });
});
