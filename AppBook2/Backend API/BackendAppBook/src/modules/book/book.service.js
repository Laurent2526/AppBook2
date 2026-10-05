const ApiError = require("../../utils/apiError");
const { toSlug } = require("../../utils/slug");
const repository = require("./book.repository");
const moderationRepository = require("../moderation/moderation.repository");
const db = require("../../config/db");

async function listPublic(input) {
  return repository.listPublic(input);
}

async function listMine(ownerId, input) {
  return repository.listMine({ ownerId, ...input });
}

async function getMine(ownerId, bookId) {
  const book = await repository.findBookById(db, bookId);
  if (!book || String(book.owner_id) !== String(ownerId) || book.deleted_at) {
    throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy truyện của bạn");
  }
  return book;
}

async function getMineStatistics(ownerId, bookId) {
  const book = await getMine(ownerId, bookId);
  return {
    bookId: book.id,
    title: book.title,
    status: book.status,
    views: Number(book.view_count || 0),
    purchases: Number(book.purchase_count || 0),
    revenue: String(book.total_revenue || "0.00"),
    followers: Number(book.follower_count || 0),
  };
}

async function getPublic(id) {
  const book = await repository.findPublicById(id);
  if (!book)
    throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách công khai");
  return book;
}

async function listChapters(bookId) {
  const book = await repository.findPublicById(bookId);
  if (!book)
    throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách công khai");
  const chapters = await repository.listChapters(bookId);
  return chapters.map((chapter) =>
    Number(chapter.is_free) === 1
      ? chapter
      : { ...chapter, preview_text: null },
  );
}

async function createBook(ownerId, input) {
  return db.transaction(async (trx) => {
    if (!(await repository.categoriesExist(trx, input.categoryIds))) {
      throw new ApiError(
        400,
        "INVALID_CATEGORIES",
        "Một hoặc nhiều thể loại không tồn tại hoặc đã tắt",
      );
    }

    const slug = input.slug || `${toSlug(input.title)}-${Date.now()}`;
    try {
      const book = await repository.createBook(trx, {
        owner_id: ownerId,
        title: input.title,
        slug,
        author_name: input.authorName || null,
        cover_url: input.coverPath || null,
        description: input.description || null,
        status: "pending",
        writing_status: input.writingStatus,
        is_mature: input.isMature ? 1 : 0,
        language: input.language,
        free_preview_chapters: input.freePreviewChapters,
      });
      await repository.attachCategories(trx, book.id, input.categoryIds);
      await moderationRepository.createRequest(trx, {
        request_type: "book_publish",
        target_type: "book",
        target_id: book.id,
        requester_id: ownerId,
      });
      return book;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY")
        throw new ApiError(409, "BOOK_SLUG_EXISTS", "Slug sách đã tồn tại");
      throw error;
    }
  });
}

async function createChapter(ownerId, bookId, input) {
  return db.transaction(async (trx) => {
    const book = await repository.findBookById(trx, bookId);
    if (!book) throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
    if (String(book.owner_id) !== String(ownerId))
      throw new ApiError(403, "BOOK_NOT_OWNED", "Bạn không sở hữu sách này");

    try {
      const chapter = await repository.createChapter(trx, {
        book_id: bookId,
        chapter_number: input.chapterNumber,
        title: input.title,
        content: input.content || null,
        content_url: input.contentUrl || null,
        preview_text: input.previewText || null,
        is_free: input.isFree ? 1 : 0,
        price: input.price,
        status: "pending",
      });
      await moderationRepository.createRequest(trx, {
        request_type: "chapter_publish",
        target_type: "chapter",
        target_id: chapter.id,
        requester_id: ownerId,
      });
      return chapter;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY")
        throw new ApiError(
          409,
          "CHAPTER_NUMBER_EXISTS",
          "Số chương đã tồn tại trong sách",
        );
      throw error;
    }
  });
}

async function updateBook(ownerId, bookId, input) {
  return db.transaction(async (trx) => {
    const book = await repository.findBookById(trx, bookId);
    if (!book) throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
    if (String(book.owner_id) !== String(ownerId)) {
      throw new ApiError(403, "BOOK_NOT_OWNED", "Bạn không sở hữu sách này");
    }
    if (["deleted", "pending_delete"].includes(book.status)) {
      throw new ApiError(
        409,
        "BOOK_NOT_EDITABLE",
        "Sách không còn cho phép chỉnh sửa",
      );
    }
    if (
      input.categoryIds &&
      !(await repository.categoriesExist(trx, input.categoryIds))
    ) {
      throw new ApiError(
        400,
        "INVALID_CATEGORIES",
        "Một hoặc nhiều thể loại không tồn tại hoặc đã tắt",
      );
    }
    if (
      await repository.findPendingModeration(trx, "book_edit", "book", bookId)
    ) {
      throw new ApiError(
        409,
        "MODERATION_ALREADY_PENDING",
        "Sách đang có yêu cầu chỉnh sửa chờ duyệt",
      );
    }

    const payload = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.authorName !== undefined
        ? { author_name: input.authorName }
        : {}),
      ...(input.coverPath !== undefined ? { cover_url: input.coverPath } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.writingStatus !== undefined
        ? { writing_status: input.writingStatus }
        : {}),
      ...(input.isMature !== undefined
        ? { is_mature: input.isMature ? 1 : 0 }
        : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      ...(input.freePreviewChapters !== undefined
        ? { free_preview_chapters: input.freePreviewChapters }
        : {}),
      ...(input.categoryIds ? { category_ids: input.categoryIds } : {}),
    };
    const moderationRequest = await moderationRepository.createRequest(trx, {
      request_type: "book_edit",
      target_type: "book",
      target_id: bookId,
      requester_id: ownerId,
      payload: JSON.stringify(payload),
    });
    return { moderationRequest };
  });
}

async function updateChapter(ownerId, chapterId, input) {
  return db.transaction(async (trx) => {
    const chapter = await repository.findChapter(chapterId);
    if (!chapter)
      throw new ApiError(404, "CHAPTER_NOT_FOUND", "Không tìm thấy chương");
    const book = await repository.findBookById(trx, chapter.book_id);
    if (!book || String(book.owner_id) !== String(ownerId)) {
      throw new ApiError(
        403,
        "CHAPTER_NOT_OWNED",
        "Bạn không sở hữu chương này",
      );
    }
    if (["deleted", "pending_delete"].includes(chapter.status)) {
      throw new ApiError(
        409,
        "CHAPTER_NOT_EDITABLE",
        "Chương không còn cho phép chỉnh sửa",
      );
    }
    if (
      input.isFree === true &&
      input.price !== undefined &&
      Number(input.price) !== 0
    ) {
      throw new ApiError(
        400,
        "INVALID_CHAPTER_PRICE",
        "Chương miễn phí phải có giá 0",
      );
    }
    if (
      input.isFree === false &&
      input.price !== undefined &&
      Number(input.price) <= 0
    ) {
      throw new ApiError(
        400,
        "INVALID_CHAPTER_PRICE",
        "Chương trả phí phải có giá dương",
      );
    }
    if (
      await repository.findPendingModeration(
        trx,
        "chapter_edit",
        "chapter",
        chapterId,
      )
    ) {
      throw new ApiError(
        409,
        "MODERATION_ALREADY_PENDING",
        "Chương đang có yêu cầu chỉnh sửa chờ duyệt",
      );
    }
    const payload = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.contentUrl !== undefined
        ? { content_url: input.contentUrl }
        : {}),
      ...(input.previewText !== undefined
        ? { preview_text: input.previewText }
        : {}),
      ...(input.isFree !== undefined ? { is_free: input.isFree ? 1 : 0 } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
    };
    const moderationRequest = await moderationRepository.createRequest(trx, {
      request_type: "chapter_edit",
      target_type: "chapter",
      target_id: chapterId,
      requester_id: ownerId,
      payload: JSON.stringify(payload),
    });
    return { moderationRequest };
  });
}

async function requestDelete(ownerId, targetType, targetId, reason) {
  return db.transaction(async (trx) => {
    const target =
      targetType === "book"
        ? await repository.findBookById(trx, targetId)
        : await repository.findChapter(targetId);
    if (!target)
      throw new ApiError(
        404,
        targetType === "book" ? "BOOK_NOT_FOUND" : "CHAPTER_NOT_FOUND",
        "Không tìm thấy nội dung",
      );
    const book =
      targetType === "book"
        ? target
        : await repository.findBookById(trx, target.book_id);
    if (String(book.owner_id) !== String(ownerId)) {
      throw new ApiError(
        403,
        "CONTENT_NOT_OWNED",
        "Bạn không sở hữu nội dung này",
      );
    }
    if (["deleted", "pending_delete"].includes(target.status)) {
      throw new ApiError(
        409,
        "DELETE_ALREADY_PENDING",
        "Nội dung đã có yêu cầu xóa hoặc đã bị xóa",
      );
    }
    const requestType = `${targetType}_delete`;
    if (
      await repository.findPendingModeration(
        trx,
        requestType,
        targetType,
        targetId,
      )
    ) {
      throw new ApiError(
        409,
        "MODERATION_ALREADY_PENDING",
        "Đã có yêu cầu xóa chờ duyệt",
      );
    }
    await trx(targetType === "book" ? "books" : "chapters")
      .where({ id: targetId })
      .update({ status: "pending_delete" });
    const moderationRequest = await moderationRepository.createRequest(trx, {
      request_type: requestType,
      target_type: targetType,
      target_id: targetId,
      requester_id: ownerId,
      reason,
      payload: JSON.stringify({ previousStatus: target.status }),
    });
    return { moderationRequest };
  });
}

async function getChapter(id, accountId) {
  const chapter = await repository.findChapter(id);
  if (!chapter || chapter.deleted_at || chapter.status === "deleted")
    throw new ApiError(
      404,
      "CHAPTER_NOT_FOUND",
      "Không tìm thấy chương công khai",
    );
  const book = await repository.findBookById(db, chapter.book_id);
  const isOwner = Boolean(
    accountId && book && String(book.owner_id) === String(accountId),
  );
  const isFree = Number(chapter.is_free) === 1;
  const purchase = accountId
    ? await repository.findActivePurchase(accountId, id)
    : null;
  if (
    !book ||
    book.deleted_at ||
    book.status === "deleted" ||
    (!isOwner &&
      (chapter.status !== "published" || book.status !== "published"))
  ) {
    throw new ApiError(
      404,
      "CHAPTER_NOT_FOUND",
      "Không tìm thấy chương công khai",
    );
  }
  if (isOwner || isFree || purchase) return chapter;
  return {
    ...chapter,
    content: null,
    content_url: null,
    preview_text: null,
    requiresPurchase: true,
  };
}

module.exports = {
  listPublic,
  listMine,
  getMine,
  getMineStatistics,
  getPublic,
  listChapters,
  createBook,
  createChapter,
  updateBook,
  updateChapter,
  requestDelete,
  getChapter,
};
