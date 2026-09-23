const db = require("../../config/db");

async function createRequest(trx, data) {
  const [id] = await trx("moderation_requests").insert(data);
  return trx("moderation_requests").where({ id }).first();
}

async function listQueue({ page, limit }) {
  const query = db("v_moderation_queue")
    .select("*")
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy([
      { column: "priority", order: "desc" },
      { column: "created_at", order: "asc" },
    ]);
  const rows = await query;
  return { rows, page, limit };
}

async function findRequestForUpdate(trx, id) {
  return trx("moderation_requests").where({ id }).forUpdate().first();
}

async function findTargetForUpdate(trx, targetType, targetId) {
  const table =
    targetType === "book"
      ? "books"
      : targetType === "chapter"
        ? "chapters"
        : null;
  if (!table) return null;
  return trx(table).where({ id: targetId }).forUpdate().first();
}

async function updateRequest(trx, id, data) {
  await trx("moderation_requests").where({ id }).update(data);
}

async function updateTarget(trx, targetType, targetId, data) {
  const table = targetType === "book" ? "books" : "chapters";
  await trx(table).where({ id: targetId }).update(data);
}

async function createAuditLog(trx, data) {
  await trx("audit_logs").insert(data);
}

module.exports = {
  db,
  createRequest,
  listQueue,
  findRequestForUpdate,
  findTargetForUpdate,
  updateRequest,
  updateTarget,
  createAuditLog,
};
