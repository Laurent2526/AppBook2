const db = require("../../config/db");

async function listPlatform({ from, to }) {
  return db("daily_platform_stats")
    .select("*")
    .whereBetween("stat_date", [from, to])
    .orderBy("stat_date", "asc");
}

async function listBooks({ from, to, bookId }) {
  const query = db("daily_book_stats")
    .select("*")
    .whereBetween("stat_date", [from, to])
    .orderBy("stat_date", "asc");
  if (bookId) query.where({ book_id: bookId });
  return query;
}

async function listAuthors({ from, to, accountId }) {
  const query = db("daily_author_stats")
    .select("*")
    .whereBetween("stat_date", [from, to])
    .orderBy("stat_date", "asc");
  if (accountId) query.where({ account_id: accountId });
  return query;
}

module.exports = { listPlatform, listBooks, listAuthors };
