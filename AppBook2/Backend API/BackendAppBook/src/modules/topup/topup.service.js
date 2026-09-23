const crypto = require("crypto");
const Decimal = require("decimal.js");
const ApiError = require("../../utils/apiError");
const repository = require("./topup.repository");

function orderCode() {
  return `TOP${Date.now()}${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")}`;
}

function transactionCode() {
  return `TXN${Date.now()}${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")}`;
}

function getWebhookSecret(provider) {
  const normalized = provider.toUpperCase();
  return (
    process.env[`${normalized}_WEBHOOK_SECRET`] ||
    process.env.TOPUP_WEBHOOK_SECRET ||
    "dev-topup-secret"
  );
}

function verifySignature(payload, signature, provider) {
  if (!signature) {
    throw new ApiError(
      401,
      "INVALID_WEBHOOK_SIGNATURE",
      "Thiếu chữ ký webhook",
    );
  }

  const secret = getWebhookSecret(provider);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  const provided = Buffer.from(signature, "hex");
  const actual = Buffer.from(expected, "hex");

  if (
    provided.length !== actual.length ||
    !crypto.timingSafeEqual(provided, actual)
  ) {
    throw new ApiError(
      401,
      "INVALID_WEBHOOK_SIGNATURE",
      "Chữ ký webhook không hợp lệ",
    );
  }
}

async function list(accountId) {
  return repository.listByAccount(accountId);
}

async function get(accountId, id) {
  const order = await repository.findById(id);
  if (!order) {
    throw new ApiError(
      404,
      "TOPUP_ORDER_NOT_FOUND",
      "Không tìm thấy đơn nạp tiền",
    );
  }
  if (order.account_id !== accountId) {
    throw new ApiError(
      404,
      "TOPUP_ORDER_NOT_FOUND",
      "Không tìm thấy đơn nạp tiền",
    );
  }
  return order;
}

async function create(accountId, input) {
  const amount = new Decimal(input.amount).toFixed(2);
  if (new Decimal(amount).lte(0)) {
    throw new ApiError(
      400,
      "INVALID_TOPUP_AMOUNT",
      "Số tiền nạp phải lớn hơn 0",
    );
  }

  const timeoutSetting = await repository.setting("topup_timeout_minutes");
  const timeoutMinutes = Number(timeoutSetting?.setting_value || 30);
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  return repository.db.transaction(async (trx) => {
    const order = await repository.createOrder(trx, {
      code: orderCode(),
      account_id: accountId,
      amount,
      currency: "VND",
      payment_method: input.paymentMethod,
      status: "pending",
      expires_at: expiresAt,
    });
    return order;
  });
}

async function webhook(provider, payload, signature) {
  const rawPayload = payload || {};
  verifySignature(rawPayload, signature, provider);

  const normalizedPayload =
    require("./topup.schema").webhookTopupSchema.parse(rawPayload);

  const gatewayTxnId =
    normalizedPayload.gatewayTxnId ||
    normalizedPayload.gateway_txn_id ||
    normalizedPayload.transactionId ||
    normalizedPayload.transaction_id ||
    normalizedPayload.id ||
    null;
  const code = normalizedPayload.code || normalizedPayload.orderCode || null;

  if (!code && !gatewayTxnId) {
    throw new ApiError(
      400,
      "INVALID_WEBHOOK_PAYLOAD",
      "Webhook thiếu mã đơn hoặc gateway transaction ID",
    );
  }

  const order =
    (code && (await repository.findByCode(code))) ||
    (gatewayTxnId && (await repository.findByGateway(provider, gatewayTxnId)));

  if (!order) {
    throw new ApiError(
      404,
      "TOPUP_ORDER_NOT_FOUND",
      "Không tìm thấy đơn nạp tiền",
    );
  }

  const amount = new Decimal(order.amount).toFixed(2);

  return repository.db.transaction(async (trx) => {
    const lockedOrder = await repository.findOrderForUpdate(trx, order.id);

    if (lockedOrder.status === "success") {
      return lockedOrder;
    }

    if (["failed", "expired", "cancelled"].includes(lockedOrder.status)) {
      throw new ApiError(
        409,
        "TOPUP_ORDER_NOT_PENDING",
        "Đơn nạp tiền không còn ở trạng thái chờ",
      );
    }

    const wallet = await repository.findWalletForUpdate(
      trx,
      lockedOrder.account_id,
    );
    const transactionId = await repository.createTransaction(trx, {
      code: transactionCode(),
      transaction_type: "topup",
      buyer_id: lockedOrder.account_id,
      amount,
      platform_fee: "0.00",
      seller_amount: "0.00",
      payment_method: lockedOrder.payment_method,
      status: "success",
      external_ref: gatewayTxnId,
      note: `Topup via ${provider}`,
      meta: JSON.stringify(normalizedPayload),
    });

    await repository.updateOrder(trx, lockedOrder.id, {
      status: "success",
      gateway_txn_id: gatewayTxnId,
      gateway_response: JSON.stringify(normalizedPayload),
      paid_at: trx.fn.now(),
      transaction_id: transactionId,
      updated_at: trx.fn.now(),
    });

    await trx("wallets")
      .where({ account_id: lockedOrder.account_id })
      .update({
        balance: trx.raw("balance + ?", [amount]),
        total_topup: trx.raw("total_topup + ?", [amount]),
        version: trx.raw("version + 1"),
      });

    await repository.addLedger(trx, {
      account_id: lockedOrder.account_id,
      transaction_id: transactionId,
      direction: "credit",
      amount,
      balance_before: wallet.balance,
      balance_after: new Decimal(wallet.balance).plus(amount).toFixed(2),
      reason: "topup",
      note: `Topup via ${provider}`,
    });

    return repository.updateOrder(trx, lockedOrder.id, {
      updated_at: trx.fn.now(),
    });
  });
}

module.exports = { list, get, create, webhook };
