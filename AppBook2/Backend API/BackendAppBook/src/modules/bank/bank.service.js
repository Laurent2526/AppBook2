const ApiError = require("../../utils/apiError");
const repository = require("./bank.repository");

async function list(accountId) {
  return repository.list(accountId);
}

async function create(accountId, input) {
  return repository.db.transaction(async (trx) => {
    if (input.isDefault) await repository.clearDefault(trx, accountId);
    return repository.create(trx, accountId, {
      bank_code: input.bankCode,
      bank_name: input.bankName,
      branch: input.branch || null,
      account_number: input.accountNumber,
      account_holder: input.accountHolder,
      is_default: input.isDefault ? 1 : 0,
    });
  });
}

async function remove(accountId, id) {
  const affected = await repository.db.transaction((trx) =>
    repository.softDelete(trx, accountId, id),
  );
  if (!affected)
    throw new ApiError(
      404,
      "BANK_ACCOUNT_NOT_FOUND",
      "Không tìm thấy tài khoản ngân hàng",
    );
}

module.exports = { list, create, remove };
