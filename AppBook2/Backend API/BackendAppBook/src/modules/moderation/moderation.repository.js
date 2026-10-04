const db = require("../../config/db");

async function createRequest(trx, data) {
  const [id] = await trx("moderation_requests").insert(data);
  return trx("moderation_requests").where({ id }).first();
}

async function listQueue({ page, limit }) {
  const query = db("v_moderation_queue as queue")
    .leftJoin("books as target_book", function joinBookTarget() {
      this.on("target_book.id", "=", "queue.target_id").andOnVal(
        "queue.target_type",
        "=",
        "book",
      );
    })
    .leftJoin("chapters as target_chapter", function joinChapterTarget() {
      this.on("target_chapter.id", "=", "queue.target_id").andOnVal(
        "queue.target_type",
        "=",
        "chapter",
      );
    })
    .leftJoin(
      "books as chapter_book",
      "chapter_book.id",
      "target_chapter.book_id",
    )
    .select(
      "queue.*",
      "target_book.title as title",
      db.raw(
        "COALESCE(??, ??) as book_title",
        ["target_book.title", "chapter_book.title"],
      ),
      "target_chapter.chapter_number as chapter_number",
      "target_chapter.title as chapter_title",
      db.raw(
        "COALESCE(??, ??) as author_name",
        ["target_book.author_name", "chapter_book.author_name"],
      ),
    )
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy([
      { column: "queue.priority", order: "desc" },
      { column: "queue.created_at", order: "desc" },
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
