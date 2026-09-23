const db = require("../../config/db");

async function findLatest(accountId) {
  return db("kyc_verifications")
    .select(
      "id",
      "account_id",
      "full_name",
      "id_front_url",
      "id_back_url",
      "selfie_url",
      "tax_code",
      "status",
      "reject_reason",
      "reviewed_at",
      "created_at",
      "updated_at",
    )
    .where({ account_id: accountId })
    .orderBy("created_at", "desc")
    .first();
}

async function create(trx, data) {
  const [id] = await trx("kyc_verifications").insert(data);
  return trx("kyc_verifications").where({ id }).first();
}

async function findForUpdate(trx, id) {
  return trx("kyc_verifications").where({ id }).forUpdate().first();
}

async function review(trx, id, data) {
  await trx("kyc_verifications").where({ id }).update(data);
}

module.exports = { db, findLatest, create, findForUpdate, review };
