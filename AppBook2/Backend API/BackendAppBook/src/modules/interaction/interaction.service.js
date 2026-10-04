const db = require("../../config/db");
const ApiError = require("../../utils/apiError");
const repository = require("./interaction.repository");

const moderatorRoles = new Set(["support", "admin", "super_admin"]);

async function rate(accountId, bookId, score) {
  return db.transaction(async (trx) => {
    const book = await repository.findPublicBook(trx, bookId);
    if (!book) {
      throw new ApiError(
        404,
        "BOOK_NOT_FOUND",
        "Không tìm thấy sách đang hiển thị",
      );
    }

    const existing = await repository.findRating(trx, accountId, bookId);
    const rating = existing
      ? await repository.updateRating(trx, existing.id, score)
      : await repository.createRating(trx, {
          account_id: accountId,
          book_id: bookId,
          score,
        });

    await repository.refreshRatingAggregate(trx, bookId);
    return { rating, updated: Boolean(existing) };
  });
}

async function validateCommentTarget(trx, bookId, input) {
  const book = await repository.findPublicBook(trx, bookId);
  if (!book) {
    throw new ApiError(
      404,
      "BOOK_NOT_FOUND",
      "Không tìm thấy sách đang hiển thị",
    );
  }

  if (input.chapterId) {
    const chapter = await repository.findPublishedChapter(
      trx,
      bookId,
      input.chapterId,
    );
    if (!chapter) {
      throw new ApiError(
        404,
        "CHAPTER_NOT_FOUND",
        "Không tìm thấy chương đang hiển thị",
      );
    }
  }

  if (input.parentId) {
    const parent = await repository.findComment(trx, input.parentId);
    if (
      !parent ||
      parent.book_id !== bookId ||
      parent.status !== "visible" ||
      parent.deleted_at
    ) {
      throw new ApiError(
        404,
        "PARENT_COMMENT_NOT_FOUND",
        "Không tìm thấy bình luận cha",
      );
    }
    if (input.chapterId && parent.chapter_id !== input.chapterId) {
      throw new ApiError(
        400,
        "COMMENT_TARGET_MISMATCH",
        "Bình luận trả lời khác chương",
      );
    }
  }
}

async function createComment(accountId, bookId, input) {
  return db.transaction(async (trx) => {
    await validateCommentTarget(trx, bookId, input);
    return repository.createComment(trx, {
      account_id: accountId,
      book_id: bookId,
      chapter_id: input.chapterId || null,
      parent_id: input.parentId || null,
      content: input.content,
    });
  });
}

async function listComments(bookId) {
  return db.transaction(async (trx) => {
    const book = await repository.findPublicBook(trx, bookId);
    if (!book) {
      throw new ApiError(
        404,
        "BOOK_NOT_FOUND",
        "Không tìm thấy sách đang hiển thị",
      );
    }
    return repository.listVisibleComments(bookId);
  });
}

async function listMyRatings(accountId) {
  return repository.listRatingsByAccount(accountId);
}

async function updateComment(accountId, role, commentId, content) {
  return db.transaction(async (trx) => {
    const comment = await repository.findComment(trx, commentId);
    if (!comment || comment.status === "deleted" || comment.deleted_at) {
      throw new ApiError(404, "COMMENT_NOT_FOUND", "Không tìm thấy bình luận");
    }
    if (
      Number(comment.account_id) !== Number(accountId) &&
      !moderatorRoles.has(role)
    ) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền sửa bình luận này",
      );
    }
    return repository.updateComment(trx, commentId, content);
  });
}

async function deleteComment(accountId, role, commentId) {
  return db.transaction(async (trx) => {
    const comment = await repository.findComment(trx, commentId);
    if (!comment || comment.status === "deleted" || comment.deleted_at) {
      throw new ApiError(404, "COMMENT_NOT_FOUND", "Không tìm thấy bình luận");
    }
    if (
      Number(comment.account_id) !== Number(accountId) &&
      !moderatorRoles.has(role)
    ) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền xoá bình luận này",
      );
    }
    await repository.softDeleteComment(trx, comment);
    return { deleted: true };
  });
}

module.exports = {
  rate,
  createComment,
  listComments,
  listMyRatings,
  updateComment,
  deleteComment,
};
