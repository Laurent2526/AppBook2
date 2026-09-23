const db = require("../../config/db");

async function listActive() {
  return db("categories")
    .select("id", "name", "slug", "description", "parent_id", "sort_order")
    .where({ is_active: 1 })
    .orderBy([
      { column: "sort_order", order: "asc" },
      { column: "name", order: "asc" },
    ]);
}

module.exports = { listActive };
