const ApiError = require("../../utils/apiError");
const { encrypt } = require("../../utils/kycCrypto");
const repository = require("./kyc.repository");

async function get(accountId) {
  return repository.findLatest(accountId);
}

async function create(accountId, input) {
  const kyc = await repository.db.transaction(async (trx) =>
    repository.create(trx, {
      account_id: accountId,
      full_name: input.fullName,
      id_number: encrypt(input.idNumber),
      id_front_url: input.idFrontUrl,
      id_back_url: input.idBackUrl,
      selfie_url: input.selfieUrl || null,
      tax_code: input.taxCode || null,
      status: "pending",
    }),
  );
  const { id_number, ...safeKyc } = kyc;
  return safeKyc;
}

async function review(admin, id, input) {
  return repository.db.transaction(async (trx) => {
    const kyc = await repository.findForUpdate(trx, id);
    if (!kyc)
      throw new ApiError(404, "KYC_NOT_FOUND", "Không tìm thấy hồ sơ KYC");
    if (kyc.status !== "pending")
      throw new ApiError(
        409,
        "KYC_ALREADY_REVIEWED",
        "Hồ sơ KYC đã được xử lý",
      );
    if (!input.approved && !input.rejectReason)
      throw new ApiError(
        400,
        "KYC_REJECT_REASON_REQUIRED",
        "Cần lý do khi từ chối KYC",
      );

    await repository.review(trx, id, {
      status: input.approved ? "approved" : "rejected",
      reject_reason: input.approved ? null : input.rejectReason,
      reviewed_by: admin.id,
      reviewed_at: trx.fn.now(),
    });
    return { id, status: input.approved ? "approved" : "rejected" };
  });
}

module.exports = { get, create, review };
