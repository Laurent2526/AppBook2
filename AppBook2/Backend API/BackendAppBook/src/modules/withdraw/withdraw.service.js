const Decimal = require("decimal.js");
const ApiError = require("../../utils/apiError");
const repository = require("./withdraw.repository");

function code() {
  return `WD${Date.now()}${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")}`;
}

async function create(accountId, input) {
  return repository.db.transaction(async (trx) => {
    const minimum = await repository.setting("min_withdraw_amount");
    if (
      new Decimal(input.amount).lessThan(minimum?.setting_value || "100000")
    ) {
      throw new ApiError(
        400,
        "WITHDRAW_AMOUNT_TOO_LOW",
        "Số tiền rút dưới mức tối thiểu",
      );
    }
    if (await repository.hasPending(trx, accountId)) {
      throw new ApiError(
        409,
        "WITHDRAW_PENDING_EXISTS",
        "Tài khoản đang có yêu cầu rút tiền chờ xử lý",
      );
    }

    const bank = await repository.findBankForUpdate(
      trx,
      accountId,
      input.bankAccountId,
    );
    if (!bank)
      throw new ApiError(
        404,
        "BANK_ACCOUNT_NOT_FOUND",
        "Không tìm thấy tài khoản ngân hàng",
      );
    const wallet = await repository.findWalletForUpdate(trx, accountId);
    if (!wallet || new Decimal(wallet.balance).lessThan(input.amount)) {
      throw new ApiError(402, "INSUFFICIENT_BALANCE", "Số dư ví không đủ");
    }

    const threshold = await repository.setting("withdraw_kyc_threshold");
    const approvedKyc = await trx("kyc_verifications")
      .where({ account_id: accountId, status: "approved" })
      .first();
    if (
      !approvedKyc ||
      new Decimal(input.amount).greaterThanOrEqualTo(
        threshold?.setting_value || "5000000",
      )
    ) {
      if (!approvedKyc)
        throw new ApiError(
          403,
          "KYC_REQUIRED",
          "Cần KYC được duyệt trước khi rút tiền",
        );
    }

    const amount = new Decimal(input.amount).toFixed(2);
    const actual = amount;
    const transactionId = await repository.createTransaction(trx, {
      code: `TXN${Date.now()}${Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0")}`,
      transaction_type: "withdraw",
      buyer_id: accountId,
      amount,
      platform_fee: "0.00",
      seller_amount: "0.00",
      payment_method: "bank_transfer",
      status: "pending",
    });
    const withdrawal = await repository.createRequest(trx, {
      code: code(),
      account_id: accountId,
      bank_account_id: bank.id,
      bank_snapshot: JSON.stringify({
        bankCode: bank.bank_code,
        bankName: bank.bank_name,
        branch: bank.branch,
        accountNumber: bank.account_number,
        accountHolder: bank.account_holder,
      }),
      amount,
      fee: "0.00",
      actual_amount: actual,
      status: "pending",
      transaction_id: transactionId,
    });
    await trx("wallets")
      .where({ account_id: accountId })
      .update({
        balance: trx.raw("balance - ?", [amount]),
        pending_withdraw: trx.raw("pending_withdraw + ?", [amount]),
        version: trx.raw("version + 1"),
      });
    await repository.addLedger(trx, {
      account_id: accountId,
      transaction_id: transactionId,
      direction: "debit",
      amount,
      balance_before: wallet.balance,
      balance_after: new Decimal(wallet.balance).minus(amount).toFixed(2),
      reason: "withdraw_hold",
    });
    return withdrawal;
  });
}

async function approve(admin, id) {
  return repository.db.transaction(async (trx) => {
    const withdrawal = await repository.findRequestForUpdate(trx, id);
    if (!withdrawal)
      throw new ApiError(
        404,
        "WITHDRAW_NOT_FOUND",
        "Không tìm thấy yêu cầu rút tiền",
      );
    if (withdrawal.status !== "pending")
      throw new ApiError(
        409,
        "WITHDRAW_ALREADY_REVIEWED",
        "Yêu cầu rút tiền đã được xử lý",
      );
    const wallet = await repository.findWalletByAccountForUpdate(
      trx,
      withdrawal.account_id,
    );
    await trx("wallets")
      .where({ account_id: withdrawal.account_id })
      .update({
        pending_withdraw: trx.raw("pending_withdraw - ?", [withdrawal.amount]),
        version: trx.raw("version + 1"),
      });
    await repository.updateRequest(trx, id, {
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: trx.fn.now(),
    });
    await repository.updateTransaction(trx, withdrawal.transaction_id, {
      status: "pending",
    });
    await repository.addLedger(trx, {
      account_id: withdrawal.account_id,
      transaction_id: withdrawal.transaction_id,
      direction: "debit",
      amount: "0.00",
      balance_before: wallet.balance,
      balance_after: wallet.balance,
      reason: "withdraw_done",
    });
    await repository.audit(trx, {
      actor_id: admin.id,
      actor_role: admin.role,
      action: "withdraw.approve",
      target_type: "withdraw",
      target_id: id,
      new_value: JSON.stringify({ status: "approved" }),
    });
    return { id, status: "approved" };
  });
}

async function reject(admin, id, rejectReason) {
  return repository.db.transaction(async (trx) => {
    const withdrawal = await repository.findRequestForUpdate(trx, id);
    if (!withdrawal)
      throw new ApiError(
        404,
        "WITHDRAW_NOT_FOUND",
        "Không tìm thấy yêu cầu rút tiền",
      );
    if (withdrawal.status !== "pending")
      throw new ApiError(
        409,
        "WITHDRAW_ALREADY_REVIEWED",
        "Yêu cầu rút tiền đã được xử lý",
      );
    const wallet = await repository.findWalletByAccountForUpdate(
      trx,
      withdrawal.account_id,
    );
    await trx("wallets")
      .where({ account_id: withdrawal.account_id })
      .update({
        balance: trx.raw("balance + ?", [withdrawal.amount]),
        pending_withdraw: trx.raw("pending_withdraw - ?", [withdrawal.amount]),
        version: trx.raw("version + 1"),
      });
    await repository.updateRequest(trx, id, {
      status: "rejected",
      reject_reason: rejectReason,
      reviewed_by: admin.id,
      reviewed_at: trx.fn.now(),
    });
    await repository.updateTransaction(trx, withdrawal.transaction_id, {
      status: "failed",
      completed_at: trx.fn.now(),
    });
    await repository.addLedger(trx, {
      account_id: withdrawal.account_id,
      transaction_id: withdrawal.transaction_id,
      direction: "credit",
      amount: withdrawal.amount,
      balance_before: wallet.balance,
      balance_after: new Decimal(wallet.balance)
        .plus(withdrawal.amount)
        .toFixed(2),
      reason: "withdraw_refund",
    });
    await repository.audit(trx, {
      actor_id: admin.id,
      actor_role: admin.role,
      action: "withdraw.reject",
      target_type: "withdraw",
      target_id: id,
      new_value: JSON.stringify({ status: "rejected", rejectReason }),
    });
    return { id, status: "rejected" };
  });
}

async function complete(admin, id, transferRef) {
  return repository.db.transaction(async (trx) => {
    const withdrawal = await repository.findRequestForUpdate(trx, id);
    if (!withdrawal)
      throw new ApiError(
        404,
        "WITHDRAW_NOT_FOUND",
        "Không tìm thấy yêu cầu rút tiền",
      );
    if (withdrawal.status !== "approved")
      throw new ApiError(
        409,
        "WITHDRAW_NOT_APPROVED",
        "Yêu cầu chưa được duyệt",
      );
    await repository.updateRequest(trx, id, {
      status: "completed",
      completed_at: trx.fn.now(),
      transfer_ref: transferRef,
    });
    await repository.updateTransaction(trx, withdrawal.transaction_id, {
      status: "success",
      completed_at: trx.fn.now(),
      external_ref: transferRef,
    });
    await trx("wallets")
      .where({ account_id: withdrawal.account_id })
      .update({
        total_withdrawn: trx.raw("total_withdrawn + ?", [withdrawal.amount]),
        version: trx.raw("version + 1"),
      });
    await repository.audit(trx, {
      actor_id: admin.id,
      actor_role: admin.role,
      action: "withdraw.complete",
      target_type: "withdraw",
      target_id: id,
      new_value: JSON.stringify({ status: "completed", transferRef }),
    });
    return { id, status: "completed" };
  });
}

module.exports = {
  create,
  list: repository.list,
  listAdmin: repository.listAdmin,
  approve,
  reject,
  complete,
};
