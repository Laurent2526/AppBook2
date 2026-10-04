const db = require("../../config/db");

function accountQuery({ search, status, role }) {
  const query = db("accounts");
  if (status) query.where("accounts.status", status);
  if (role) query.where("accounts.role", role);
  if (search) {
    query.where((builder) =>
      builder
        .where("accounts.username", "like", `%${search}%`)
        .orWhere("accounts.full_name", "like", `%${search}%`)
        .orWhere("accounts.email", "like", `%${search}%`)
        .orWhere("accounts.phone", "like", `%${search}%`),
    );
  }
  return query;
}

async function listAccounts(input) {
  const query = accountQuery(input);
  const [{ total }] = await query.clone().count({ total: "accounts.id" });
  const rows = await query
    .select(
      "accounts.id",
      "accounts.username",
      "accounts.email",
      "accounts.phone",
      "accounts.full_name",
      "accounts.avatar_url",
      "accounts.role",
      "accounts.is_author",
      "accounts.status",
      "accounts.created_at",
      "accounts.last_login_at",
    )
    .orderBy("accounts.created_at", "desc")
    .limit(input.limit)
    .offset((input.page - 1) * input.limit);
  return { rows, total: Number(total), page: input.page, limit: input.limit };
}

async function findAccount(trx, id, forUpdate = false) {
  const query = trx("accounts").where({ id });
  if (forUpdate) query.forUpdate();
  return query.first();
}

async function hasPublishedBooks(trx, accountId) {
  return trx("books")
    .where({ owner_id: accountId, status: "published" })
    .whereNull("deleted_at")
    .first();
}

function bookQuery({ search, status }) {
  const query = db("books as books").leftJoin(
    "accounts as owners",
    "owners.id",
    "books.owner_id",
  );
  if (status) query.where("books.status", status);
  if (search) {
    query.where((builder) =>
      builder
        .where("books.title", "like", `%${search}%`)
        .orWhere("books.author_name", "like", `%${search}%`)
        .orWhere("owners.username", "like", `%${search}%`)
        .orWhere("owners.full_name", "like", `%${search}%`),
    );
  }
  return query;
}

async function listBooks(input) {
  const query = bookQuery(input);
  const [{ total }] = await query.clone().countDistinct({ total: "books.id" });
  const rows = await query
    .select(
      "books.id",
      "books.title",
      "books.author_name",
      "books.status",
      "books.writing_status",
      "books.cover_url",
      "books.view_count",
      "books.purchase_count",
      "books.total_revenue",
      "books.updated_at",
      "books.owner_id",
      "owners.username as owner_username",
      "owners.full_name as owner_name",
    )
    .orderBy("books.updated_at", "desc")
    .limit(input.limit)
    .offset((input.page - 1) * input.limit);
  return { rows, total: Number(total), page: input.page, limit: input.limit };
}

async function findBook(trx, id, forUpdate = false) {
  const query = trx("books").where({ id });
  if (forUpdate) query.forUpdate();
  return query.first();
}

async function getBookDetails(id) {
  const book = await db("books as books")
    .leftJoin("accounts as owners", "owners.id", "books.owner_id")
    .select(
      "books.*",
      "owners.username as owner_username",
      "owners.full_name as owner_name",
    )
    .where("books.id", id)
    .first();
  if (!book) return null;
  const chapters = await db("chapters")
    .select(
      "id",
      "chapter_number",
      "title",
      "status",
      "is_free",
      "price",
      "view_count",
      "purchase_count",
    )
    .where({ book_id: id })
    .orderBy("chapter_number", "asc");
  return { book, chapters };
}

async function createAuditLog(trx, data) {
  await trx("audit_logs").insert(data);
}

module.exports = {
  db,
  listAccounts,
  findAccount,
  hasPublishedBooks,
  listBooks,
  findBook,
  getBookDetails,
  createAuditLog,
};
