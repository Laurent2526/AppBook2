const ApiError = require("../../utils/apiError");
const repository = require("./wallet.repository");

const purchaseErrors = {
  CHAPTER_NOT_FOUND: [404, "CHAPTER_NOT_FOUND", "Không tìm thấy chương"],
  CHAPTER_NOT_AVAILABLE: [
    409,
    "CHAPTER_NOT_AVAILABLE",
    "Chương chưa được công khai",
  ],
  FREE_CHAPTER: [409, "FREE_CHAPTER", "Chương miễn phí không cần mua"],
  OWNER_CANNOT_BUY: [
    403,
    "OWNER_CANNOT_BUY",
    "Chủ sách không thể tự mua chương",
  ],
  ALREADY_PURCHASED: [409, "ALREADY_PURCHASED", "Chương đã được mua trước đó"],
  INSUFFICIENT_BALANCE: [402, "INSUFFICIENT_BALANCE", "Số dư ví không đủ"],
  PLATFORM_ADMIN_NOT_CONFIGURED: [
    503,
    "PLATFORM_ADMIN_NOT_CONFIGURED",
    "Chưa cấu hình tài khoản nhận phí nền tảng",
  ],
  PLATFORM_ADMIN_WALLET_NOT_FOUND: [
    503,
    "PLATFORM_ADMIN_WALLET_NOT_FOUND",
    "Không tìm thấy ví nhận phí nền tảng",
  ],
};

async function getWallet(accountId) {
  const wallet = await repository.findWallet(accountId);
  if (!wallet) throw new ApiError(404, "WALLET_NOT_FOUND", "Không tìm thấy ví");
  return wallet;
}

async function purchaseChapter(accountId, chapterId) {
  const result = await repository.purchaseChapter(accountId, chapterId);
  if (result.result !== "SUCCESS") {
    const mapped = purchaseErrors[result.result];
    if (mapped) throw new ApiError(...mapped);
    throw new ApiError(
      500,
      "PURCHASE_FAILED",
      "Không thể hoàn tất giao dịch mua chương",
    );
  }
  return { transactionId: result.transactionId, status: "success" };
}

async function getTransaction(accountId, transactionId) {
  const transaction = await repository.findTransaction(
    accountId,
    transactionId,
  );
  if (!transaction)
    throw new ApiError(
      404,
      "TRANSACTION_NOT_FOUND",
      "Không tìm thấy giao dịch",
    );
  return transaction;
}

module.exports = {
  getWallet,
  listEntries: repository.listEntries,
  listPurchases: repository.listPurchases,
  purchaseChapter,
  getTransaction,
};
