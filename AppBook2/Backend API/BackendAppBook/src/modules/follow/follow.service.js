const Decimal = require("decimal.js");
const db = require("../../config/db");
const ApiError = require("../../utils/apiError");
const repository = require("./follow.repository");

async function follow(accountId, input) {
  return db.transaction(async (trx) => {
    if (input.targetType === "account") {
      const target = await repository.findAccountById(input.targetId);
      if (!target) {
        throw new ApiError(
          404,
          "ACCOUNT_NOT_FOUND",
          "Không tìm thấy người dùng",
        );
      }
    } else {
      const target = await repository.findBookById(input.targetId);
      if (!target) {
        throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
      }
    }

    const existing = await repository.findFollow(
      trx,
      accountId,
      input.targetType,
      input.targetId,
    );
    if (existing) {
      throw new ApiError(409, "ALREADY_FOLLOWING", "Bạn đã theo dõi mục này");
    }

    return repository.createFollow(trx, {
      follower_id: accountId,
      target_type: input.targetType,
      target_id: input.targetId,
    });
  });
}

async function unfollow(accountId, targetType, targetId) {
  return db.transaction(async (trx) => {
    const deleted = await repository.deleteFollow(
      trx,
      accountId,
      targetType,
      Number(targetId),
    );
    if (!deleted) {
      throw new ApiError(404, "FOLLOW_NOT_FOUND", "Bạn chưa theo dõi mục này");
    }
    return { deleted: true };
  });
}

async function listFollows(accountId) {
  return repository.listFollows(accountId);
}

async function updateReadingHistory(accountId, bookId, input) {
  return db.transaction(async (trx) => {
    const book = await repository.findBookById(bookId);
    if (!book) {
      throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
    }

    const payload = {
      lastChapterId: input.lastChapterId || null,
      progressPercent: input.progressPercent
        ? new Decimal(input.progressPercent).toFixed(2)
        : null,
      scrollPosition: input.scrollPosition ?? null,
      chaptersRead: input.chaptersRead ?? null,
      totalReadTime: input.totalReadTime ?? null,
    };

    return repository.upsertReadingHistory(trx, accountId, bookId, payload);
  });
}

async function listReadingHistory(accountId) {
  return repository.listReadingHistory(accountId);
}

module.exports = {
  follow,
  unfollow,
  listFollows,
  updateReadingHistory,
  listReadingHistory,
};
