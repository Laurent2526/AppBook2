const Decimal = require("decimal.js");
const ApiError = require("../../utils/apiError");
const repository = require("./refund.repository");

function generateCode(prefix = "RF") {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")}`;
}

async function listMine(accountId) {
  return repository.listByAccount(accountId);
}

async function listAdmin() {
  return repository.listAll();
}

async function create(accountId, input) {
  return repository.db.transaction(async (trx) => {
    const purchase = await repository.findPurchaseForAccountAndChapter(
      accountId,
      input.chapterId,
    );
    if (!purchase) {
      throw new ApiError(
        404,
        "PURCHASE_NOT_FOUND",
        "Bạn chưa mua chương này nên không thể yêu cầu hoàn tiền",
      );
    }

    const originalTxn = await repository.findTransactionForBuyer(
      trx,
      accountId,
      input.transactionId,
    );
    if (!originalTxn) {
      throw new ApiError(
        404,
        "TRANSACTION_NOT_FOUND",
        "Không tìm thấy giao dịch mua hợp lệ",
      );
    }
    if (originalTxn.status === "pending") {
      throw new ApiError(
        409,
        "TRANSACTION_NOT_COMPLETED",
        "Giao dịch mua chưa hoàn tất",
      );
    }
    if (originalTxn.status === "refunded") {
      throw new ApiError(
        409,
        "ALREADY_REFUNDED",
        "Giao dịch này đã được hoàn tiền",
      );
    }

    const existing = await repository.findRefundByTransaction(
      accountId,
      input.transactionId,
    );
    if (existing) {
      throw new ApiError(
        409,
        "REFUND_REQUEST_EXISTS",
        "Bạn đã gửi yêu cầu hoàn tiền cho giao dịch này",
      );
    }

    const refund = await repository.createRefundRequest(trx, {
      account_id: accountId,
      transaction_id: originalTxn.id,
      chapter_id: input.chapterId,
      reason: input.reason,
      description: input.description || null,
      evidence_urls: input.evidenceUrls
        ? JSON.stringify(input.evidenceUrls)
        : null,
      amount_requested: originalTxn.amount,
      amount_refunded: null,
      status: "pending",
      clawback_from_seller: 1,
    });

    return refund;
  });
}

async function approve(admin, id, adminNote) {
  return repository.db.transaction(async (trx) => {
    const refund = await repository.findRefundForUpdate(trx, id);
    if (!refund) {
      throw new ApiError(
        404,
        "REFUND_NOT_FOUND",
        "Không tìm thấy yêu cầu hoàn tiền",
      );
    }
    if (refund.status !== "pending") {
      throw new ApiError(
        409,
        "REFUND_ALREADY_REVIEWED",
        "Yêu cầu hoàn tiền đã được xử lý",
      );
    }

    const originalTxn = await repository.findTransactionForUpdate(
      trx,
      refund.transaction_id,
    );
    if (!originalTxn) {
      throw new ApiError(
        404,
        "TRANSACTION_NOT_FOUND",
        "Không tìm thấy giao dịch gốc",
      );
    }

    const amount = new Decimal(refund.amount_requested).toFixed(2);
    const refundTxId = await repository.createTransaction(trx, {
      code: generateCode("TXN"),
      transaction_type: "refund",
      buyer_id: refund.account_id,
      seller_id: originalTxn.seller_id,
      book_id: originalTxn.book_id,
      chapter_id: originalTxn.chapter_id,
      amount,
      platform_fee: "0.00",
      seller_amount: "0.00",
      fee_percent: originalTxn.fee_percent || 5,
      currency: originalTxn.currency || "VND",
      payment_method: originalTxn.payment_method || "wallet",
      status: "success",
      ref_transaction_id: originalTxn.id,
      note: "Purchase refund",
      meta: JSON.stringify({ refundRequestId: refund.id }),
    });

    const buyerWallet = await repository.findWalletForUpdate(
      trx,
      refund.account_id,
    );
    if (buyerWallet) {
      await trx("wallets")
        .where({ account_id: refund.account_id })
        .update({
          balance: trx.raw("balance + ?", [amount]),
          version: trx.raw("version + 1"),
        });
      await repository.addLedger(trx, {
        account_id: refund.account_id,
        transaction_id: refundTxId,
        direction: "credit",
        amount,
        balance_before: buyerWallet.balance,
        balance_after: new Decimal(buyerWallet.balance).plus(amount).toFixed(2),
        reason: "refund_in",
        note: "Hoàn tiền mua chương",
      });
    }

    if (originalTxn.seller_id && originalTxn.seller_amount) {
      const sellerWallet = await repository.findWalletForUpdate(
        trx,
        originalTxn.seller_id,
      );
      if (sellerWallet) {
        const clawback = new Decimal(originalTxn.seller_amount).toFixed(2);
        await trx("wallets")
          .where({ account_id: originalTxn.seller_id })
          .update({
            balance: trx.raw("balance - ?", [clawback]),
            version: trx.raw("version + 1"),
          });
        await repository.addLedger(trx, {
          account_id: originalTxn.seller_id,
          transaction_id: refundTxId,
          direction: "debit",
          amount: clawback,
          balance_before: sellerWallet.balance,
          balance_after: new Decimal(sellerWallet.balance)
            .minus(clawback)
            .toFixed(2),
          reason: "refund_clawback",
          note: "Thu hồi doanh thu đã chia",
        });
      }
    }

    await repository.updateRefund(trx, refund.id, {
      status: "approved",
      amount_refunded: amount,
      admin_note: adminNote || null,
      reviewed_by: admin.id,
      reviewed_at: trx.fn.now(),
    });

    await repository.updateTransaction(trx, originalTxn.id, {
      status: "refunded",
      completed_at: trx.fn.now(),
    });

    await repository.updatePurchase(trx, refund.account_id, refund.chapter_id, {
      is_revoked: 1,
    });

    return {
      id: refund.id,
      transactionId: refund.transaction_id,
      status: "approved",
    };
  });
}

async function reject(admin, id, adminNote) {
  return repository.db.transaction(async (trx) => {
    const refund = await repository.findRefundForUpdate(trx, id);
    if (!refund) {
      throw new ApiError(
        404,
        "REFUND_NOT_FOUND",
        "Không tìm thấy yêu cầu hoàn tiền",
      );
    }
    if (refund.status !== "pending") {
      throw new ApiError(
        409,
        "REFUND_ALREADY_REVIEWED",
        "Yêu cầu hoàn tiền đã được xử lý",
      );
    }

    await repository.updateRefund(trx, refund.id, {
      status: "rejected",
      admin_note: adminNote || null,
      reviewed_by: admin.id,
      reviewed_at: trx.fn.now(),
    });

    return { id: refund.id, status: "rejected" };
  });
}

module.exports = { create, listMine, listAdmin, approve, reject };
