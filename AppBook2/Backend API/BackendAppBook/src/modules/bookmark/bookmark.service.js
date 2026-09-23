const db = require("../../config/db");
const ApiError = require("../../utils/apiError");
const repository = require("./bookmark.repository");

async function create(accountId, input) {
  return db.transaction(async (trx) => {
    const book = await repository.findPublicBook(trx, input.bookId);
    if (!book) {
      throw new ApiError(
        404,
        "BOOK_NOT_FOUND",
        "Không tìm thấy sách đang hiển thị",
      );
    }

    const existing = await repository.findBookmark(
      trx,
      accountId,
      input.bookId,
    );
    if (existing) {
      throw new ApiError(
        409,
        "ALREADY_BOOKMARKED",
        "Sách đã có trong tủ truyện",
      );
    }

    return repository.createBookmark(trx, {
      account_id: accountId,
      book_id: input.bookId,
      folder: input.folder ?? null,
    });
  });
}

async function remove(accountId, bookId) {
  return db.transaction(async (trx) => {
    const deleted = await repository.deleteBookmark(trx, accountId, bookId);
    if (!deleted) {
      throw new ApiError(
        404,
        "BOOKMARK_NOT_FOUND",
        "Sách chưa có trong tủ truyện",
      );
    }
    return { deleted: true };
  });
}

async function list(accountId) {
  return repository.listBookmarks(accountId);
}

module.exports = { create, remove, list };
