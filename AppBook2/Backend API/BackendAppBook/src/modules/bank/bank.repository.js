const db = require("../../config/db");

async function list(accountId) {
  return db("bank_accounts")
    .select(
      "id",
      "bank_code",
      "bank_name",
      "branch",
      "account_number",
      "account_holder",
      "is_default",
      "is_verified",
      "created_at",
    )
    .where({ account_id: accountId })
    .whereNull("deleted_at")
    .orderBy("is_default", "desc");
}

async function findForAccount(trx, accountId, id) {
  return trx("bank_accounts")
    .where({ id, account_id: accountId })
    .whereNull("deleted_at")
    .first();
}

async function clearDefault(trx, accountId) {
  await trx("bank_accounts")
    .where({ account_id: accountId })
    .update({ is_default: 0 });
}

async function create(trx, accountId, data) {
  const [id] = await trx("bank_accounts").insert({
    account_id: accountId,
    ...data,
  });
  return trx("bank_accounts").where({ id }).first();
}

async function softDelete(trx, accountId, id) {
  return trx("bank_accounts")
    .where({ id, account_id: accountId })
    .whereNull("deleted_at")
    .update({ deleted_at: trx.fn.now(), is_default: 0 });
}

module.exports = { db, list, findForAccount, clearDefault, create, softDelete };
