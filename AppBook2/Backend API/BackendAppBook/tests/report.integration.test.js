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

  const loggedIn = await request(app)
    .post("/api/auth/login")
    .send({ identifier: email, password, platform: "web" });
  expect(loggedIn.status).toBe(200);

  return { accountId, token: loggedIn.body.data.accessToken };
}

describe("Reports and auto-hide", () => {
  const accountIds = [];
  const bookIds = [];
  let originalThreshold;

  beforeAll(async () => {
    const setting = await db("system_settings")
      .where({ setting_key: "auto_hide_report_count" })
      .first();
    originalThreshold = setting?.setting_value || "10";
    await db("system_settings")
      .where({ setting_key: "auto_hide_report_count" })
      .update({ setting_value: "2" });
  });

  afterAll(async () => {
    await db("system_settings")
      .where({ setting_key: "auto_hide_report_count" })
      .update({ setting_value: originalThreshold });
    if (bookIds.length) await db("books").whereIn("id", bookIds).del();
    if (accountIds.length) await db("accounts").whereIn("id", accountIds).del();
    await db.destroy();
  });

  it("deduplicates reports, auto-hides at the configured threshold, and lets admins decide", async () => {
    const owner = await createUser("report_owner");
    const reporterOne = await createUser("report_one");
    const reporterTwo = await createUser("report_two");
    const admin = await createUser("report_admin", "admin");
    accountIds.push(
      owner.accountId,
      reporterOne.accountId,
      reporterTwo.accountId,
      admin.accountId,
    );

    const [bookId] = await db("books").insert({
      owner_id: owner.accountId,
      title: `Report Book ${Date.now()}`,
      slug: `report-book-${Date.now()}`,
      status: "published",
      writing_status: "ongoing",
      language: "vi",
      published_at: db.fn.now(),
    });
    bookIds.push(bookId);

    const first = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${reporterOne.token}`)
      .send({
        targetType: "book",
        targetId: bookId,
        reason: "spam",
        description: "Repeated promotional content",
      });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${reporterOne.token}`)
      .send({ targetType: "book", targetId: bookId, reason: "spam" });
    expect(duplicate.status).toBe(409);

    const forbiddenQueue = await request(app)
      .get("/api/admin/reports")
      .set("Authorization", `Bearer ${reporterOne.token}`);
    expect(forbiddenQueue.status).toBe(403);

    const second = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${reporterTwo.token}`)
      .send({ targetType: "book", targetId: bookId, reason: "spam" });
    expect(second.status).toBe(201);

    const hiddenBook = await db("books").where({ id: bookId }).first();
    expect(hiddenBook.status).toBe("hidden");

    const autoHideAudit = await db("audit_logs")
      .where({
        action: "content.auto_hide",
        target_type: "book",
        target_id: bookId,
      })
      .first();
    expect(autoHideAudit).toBeTruthy();
    expect(autoHideAudit.actor_role).toBe("system");

    const queue = await request(app)
      .get("/api/admin/reports")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data.items.length).toBeGreaterThanOrEqual(2);

    const resolved = await request(app)
      .post(`/api/admin/reports/${first.body.data.report.id}/resolve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ actionTaken: "hidden", adminNote: "Giữ ẩn nội dung" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.report.status).toBe("resolved");

    const dismissed = await request(app)
      .post(`/api/admin/reports/${second.body.data.report.id}/dismiss`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ adminNote: "Đã xử lý tự động" });
    expect(dismissed.status).toBe(200);
    expect(dismissed.body.data.report.status).toBe("dismissed");

    const accountReport = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${reporterTwo.token}`)
      .send({
        targetType: "account",
        targetId: reporterOne.accountId,
        reason: "harassment",
        description: "Tài khoản gửi nội dung quấy rối",
      });
    expect(accountReport.status).toBe(201);

    const accountResolved = await request(app)
      .post(
        `/api/admin/reports/${accountReport.body.data.report.id}/resolve`,
      )
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ actionTaken: "account_locked", adminNote: "Xác minh vi phạm" });
    expect(accountResolved.status).toBe(200);
    expect(accountResolved.body.data.report.action_taken).toBe("account_locked");
    const lockedAccount = await db("accounts")
      .where({ id: reporterOne.accountId })
      .first();
    expect(lockedAccount.status).toBe("locked");
    const revokedSessions = await db("user_sessions")
      .where({ account_id: reporterOne.accountId })
      .whereNotNull("revoked_at");
    expect(revokedSessions.length).toBeGreaterThan(0);
  });
});
