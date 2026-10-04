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
  const login = await request(app)
    .post("/api/auth/login")
    .send({ identifier: email, password, platform: "web" });
  expect(login.status).toBe(200);
  return { accountId, token: login.body.data.accessToken };
}

describe("Withdraw and KYC", () => {
  const accountIds = [];

  afterAll(async () => {
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("creates KYC, holds money, approves and completes withdrawal", async () => {
    const user = await createUser("withdraw_user");
    const admin = await createUser("withdraw_admin", "admin");
    accountIds.push(user.accountId, admin.accountId);

    const bank = await request(app)
      .post("/api/me/bank-accounts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        bankCode: "VCB",
        bankName: "Vietcombank",
        branch: "Ha Noi",
        accountNumber: "0123456789",
        accountHolder: "NGUYEN VAN TEST",
        isDefault: true,
      });
    expect(bank.status).toBe(201);

    const kyc = await request(app)
      .post("/api/me/kyc")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        fullName: "Nguyen Van Test",
        idNumber: "012345678901",
        idFrontUrl: "https://example.com/front.jpg",
        idBackUrl: "https://example.com/back.jpg",
      });
    expect(kyc.status).toBe(201);
    expect(kyc.body.data.kyc.id_number).toBeUndefined();
    const kycRow = await db("kyc_verifications")
      .where({ id: kyc.body.data.kyc.id })
      .first();
    expect(kycRow.id_number.startsWith("enc:v1:")).toBe(true);

    const reviewed = await request(app)
      .post(`/api/admin/kyc/${kycRow.id}/review`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ approved: true });
    expect(reviewed.status).toBe(200);

    await db("wallets")
      .where({ account_id: user.accountId })
      .update({ balance: "300000.00" });
    const created = await request(app)
      .post("/api/me/withdrawals")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ bankAccountId: bank.body.data.bankAccount.id, amount: "200000" });
    expect(created.status).toBe(201);
    const withdrawalId = created.body.data.withdrawal.id;
    const adminQueue = await request(app)
      .get("/api/admin/withdrawals")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(adminQueue.status).toBe(200);
    expect(
      adminQueue.body.data.withdrawals.find((item) => item.id === withdrawalId)
        .account_username,
    ).toContain("withdraw_user");

    let wallet = await db("wallets")
      .where({ account_id: user.accountId })
      .first();
    expect(String(wallet.balance)).toBe("100000.00");
    expect(String(wallet.pending_withdraw)).toBe("200000.00");
    expect(
      (
        await db("wallet_entries").where({
          transaction_id: created.body.data.withdrawal.transaction_id,
        })
      ).map((row) => row.reason),
    ).toContain("withdraw_hold");

    const approved = await request(app)
      .post(`/api/admin/withdrawals/${withdrawalId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send();
    expect(approved.status).toBe(200);
    wallet = await db("wallets").where({ account_id: user.accountId }).first();
    expect(String(wallet.balance)).toBe("100000.00");
    expect(String(wallet.pending_withdraw)).toBe("0.00");

    const completed = await request(app)
      .post(`/api/admin/withdrawals/${withdrawalId}/complete`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ transferRef: "UNC-TEST-001" });
    expect(completed.status).toBe(200);
    wallet = await db("wallets").where({ account_id: user.accountId }).first();
    expect(String(wallet.total_withdrawn)).toBe("200000.00");
    const finalRequest = await db("withdraw_requests")
      .where({ id: withdrawalId })
      .first();
    expect(finalRequest.status).toBe("completed");
  });

  it("rejects withdrawal and refunds the held balance", async () => {
    const user = await createUser("reject_withdraw");
    const admin = await createUser("reject_withdraw_admin", "super_admin");
    accountIds.push(user.accountId, admin.accountId);

    const bank = await request(app)
      .post("/api/me/bank-accounts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        bankCode: "TCB",
        bankName: "Techcombank",
        accountNumber: "9876543210",
        accountHolder: "TEST USER",
        isDefault: true,
      });
    expect(bank.status).toBe(201);
    const kyc = await request(app)
      .post("/api/me/kyc")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        fullName: "Test User",
        idNumber: "123456789012",
        idFrontUrl: "https://example.com/front2.jpg",
        idBackUrl: "https://example.com/back2.jpg",
      });
    const kycRow = await db("kyc_verifications")
      .where({ id: kyc.body.data.kyc.id })
      .first();
    await request(app)
      .post(`/api/admin/kyc/${kycRow.id}/review`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ approved: true });
    await db("wallets")
      .where({ account_id: user.accountId })
      .update({ balance: "250000.00" });

    const created = await request(app)
      .post("/api/me/withdrawals")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ bankAccountId: bank.body.data.bankAccount.id, amount: "150000" });
    expect(created.status).toBe(201);
    const rejected = await request(app)
      .post(`/api/admin/withdrawals/${created.body.data.withdrawal.id}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ rejectReason: "Thong tin ngan hang can doi soat" });
    expect(rejected.status).toBe(200);

    const wallet = await db("wallets")
      .where({ account_id: user.accountId })
      .first();
    expect(String(wallet.balance)).toBe("250000.00");
    expect(String(wallet.pending_withdraw)).toBe("0.00");
    const entries = await db("wallet_entries").where({
      transaction_id: created.body.data.withdrawal.transaction_id,
    });
    expect(entries.map((row) => row.reason)).toEqual(
      expect.arrayContaining(["withdraw_hold", "withdraw_refund"]),
    );
  });

  it("rejects invalid withdrawal business rules", async () => {
    const user = await createUser("invalid_withdraw");
    accountIds.push(user.accountId);
    const bank = await request(app)
      .post("/api/me/bank-accounts")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        bankCode: "MB",
        bankName: "MB Bank",
        accountNumber: "1234567890",
        accountHolder: "TEST USER",
      });
    expect(bank.status).toBe(201);

    const low = await request(app)
      .post("/api/me/withdrawals")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ bankAccountId: bank.body.data.bankAccount.id, amount: "50000" });
    expect(low.status).toBe(400);
    expect(low.body.error.code).toBe("WITHDRAW_AMOUNT_TOO_LOW");

    await db("wallets")
      .where({ account_id: user.accountId })
      .update({ balance: "200000.00" });
    const noKyc = await request(app)
      .post("/api/me/withdrawals")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ bankAccountId: bank.body.data.bankAccount.id, amount: "100000" });
    expect(noKyc.status).toBe(403);
    expect(noKyc.body.error.code).toBe("KYC_REQUIRED");
  });
});
