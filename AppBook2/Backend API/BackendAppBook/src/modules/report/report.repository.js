const db = require("../../config/db");

const targetTables = {
  book: "books",
  chapter: "chapters",
  comment: "comments",
  account: "accounts",
  message: "messages",
};

function targetTable(targetType) {
  return targetTables[targetType];
}

async function findTarget(trx, targetType, targetId, forUpdate = false) {
  const query = trx(targetTable(targetType)).where({ id: targetId });
  if (forUpdate) query.forUpdate();
  return query.first();
}

async function findReport(trx, id, forUpdate = false) {
  const query = trx("reports").where({ id });
  if (forUpdate) query.forUpdate();
  return query.first();
}

async function findDuplicate(trx, reporterId, targetType, targetId) {
  return trx("reports")
    .where({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
    })
    .first();
}

async function createReport(trx, data) {
  const [id] = await trx("reports").insert(data);
  return findReport(trx, id);
}

async function countOpenReports(trx, targetType, targetId) {
  const result = await trx("reports")
    .where({ target_type: targetType, target_id: targetId })
    .whereIn("status", ["pending", "reviewing"])
    .count({ count: "id" })
    .first();
  return Number(result.count || 0);
}

async function getSetting(trx, key) {
  return trx("system_settings").where({ setting_key: key }).first();
}

async function updateTarget(trx, targetType, targetId, data) {
  await trx(targetTable(targetType)).where({ id: targetId }).update(data);
}

async function updateReport(trx, id, data) {
  await trx("reports").where({ id }).update(data);
  return findReport(trx, id);
}

async function listQueue() {
  return db("reports")
    .select(
      "id",
      "reporter_id",
      "target_type",
      "target_id",
      "reason",
      "description",
      "evidence_urls",
      "status",
      "action_taken",
      "admin_note",
      "reviewed_by",
      "reviewed_at",
      "created_at",
    )
    .whereIn("status", ["pending", "reviewing"])
    .orderBy("created_at", "asc");
}

async function createAuditLog(trx, data) {
  await trx("audit_logs").insert(data);
}

module.exports = {
  targetTable,
  findTarget,
  findReport,
  findDuplicate,
  createReport,
  countOpenReports,
  getSetting,
  updateTarget,
  updateReport,
  listQueue,
  createAuditLog,
};
