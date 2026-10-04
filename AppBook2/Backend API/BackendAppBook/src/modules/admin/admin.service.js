const ApiError = require("../../utils/apiError");
const repository = require("./admin.repository");

function assertCanManage(actor, target) {
  if (String(actor.id) === String(target.id)) {
    throw new ApiError(
      409,
      "CANNOT_MANAGE_SELF",
      "Không thể khóa hoặc xóa chính mình",
    );
  }
  if (target.role === "super_admin") {
    throw new ApiError(
      403,
      "PROTECTED_ACCOUNT",
      "Không thể thay đổi tài khoản super admin",
    );
  }
  if (target.role === "admin" && actor.role !== "super_admin") {
    throw new ApiError(
      403,
      "INSUFFICIENT_ROLE",
      "Chỉ super admin được quản lý admin",
    );
  }
}

async function listAccounts(input) {
  return repository.listAccounts(input);
}

async function updateAccountStatus(actor, id, input) {
  return repository.db.transaction(async (trx) => {
    const account = await repository.findAccount(trx, id, true);
    if (!account || account.status === "deleted") {
      throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản");
    }
    assertCanManage(actor, account);
    if (account.status === input.status)
      return { id: account.id, status: account.status };
    if (
      (input.status === "locked" && account.status !== "active") ||
      (input.status === "active" && account.status !== "locked")
    ) {
      throw new ApiError(
        409,
        "INVALID_ACCOUNT_STATUS_TRANSITION",
        "Chỉ có thể khóa tài khoản đang hoạt động hoặc mở khóa tài khoản bị khóa",
      );
    }

    const updates =
      input.status === "locked"
        ? {
            status: "locked",
            lock_reason: input.reason || "Khóa bởi quản trị viên",
            locked_at: trx.fn.now(),
            locked_by: actor.id,
            locked_until: null,
          }
        : {
            status: "active",
            lock_reason: null,
            locked_at: null,
            locked_by: null,
            locked_until: null,
          };
    await trx("accounts").where({ id }).update(updates);
    if (input.status === "locked") {
      await trx("user_sessions")
        .where({ account_id: id })
        .whereNull("revoked_at")
        .update({ revoked_at: trx.fn.now(), revoked_reason: "admin_lock" });
    }
    await repository.createAuditLog(trx, {
      actor_id: actor.id,
      actor_role: actor.role,
      action: input.status === "locked" ? "account.lock" : "account.unlock",
      target_type: "account",
      target_id: id,
      old_value: JSON.stringify({ status: account.status }),
      new_value: JSON.stringify({
        status: input.status,
        reason: input.reason || null,
      }),
    });
    return { id: account.id, status: input.status };
  });
}

async function deleteAccount(actor, id) {
  return repository.db.transaction(async (trx) => {
    const account = await repository.findAccount(trx, id, true);
    if (!account || account.status === "deleted") {
      throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản");
    }
    assertCanManage(actor, account);
    if (await repository.hasPublishedBooks(trx, id)) {
      throw new ApiError(
        409,
        "ACCOUNT_HAS_PUBLISHED_BOOKS",
        "Hãy ẩn hoặc chuyển quyền sở hữu sách công khai trước khi xóa tài khoản",
      );
    }

    await trx("accounts")
      .where({ id })
      .update({
        username: `deleted_${id}`,
        email: `deleted_${id}@invalid.local`,
        phone: null,
        full_name: null,
        avatar_url: null,
        bio: null,
        status: "deleted",
        deleted_at: trx.fn.now(),
        lock_reason: null,
      });
    await trx("user_sessions")
      .where({ account_id: id })
      .whereNull("revoked_at")
      .update({ revoked_at: trx.fn.now(), revoked_reason: "admin_lock" });
    await repository.createAuditLog(trx, {
      actor_id: actor.id,
      actor_role: actor.role,
      action: "account.delete",
      target_type: "account",
      target_id: id,
      old_value: JSON.stringify({
        status: account.status,
        username: account.username,
      }),
      new_value: JSON.stringify({
        status: "deleted",
        personalDataAnonymized: true,
      }),
    });
    return { id: account.id, status: "deleted" };
  });
}

async function listBooks(input) {
  return repository.listBooks(input);
}

async function getBook(id) {
  const result = await repository.getBookDetails(id);
  if (!result) throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
  return result;
}

async function updateBook(actor, id, input) {
  return repository.db.transaction(async (trx) => {
    const book = await repository.findBook(trx, id, true);
    if (!book || book.status === "deleted") {
      throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
    }
    const updates = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.authorName !== undefined
        ? { author_name: input.authorName }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.writingStatus !== undefined
        ? { writing_status: input.writingStatus }
        : {}),
      ...(input.isMature !== undefined
        ? { is_mature: input.isMature ? 1 : 0 }
        : {}),
    };
    await trx("books").where({ id }).update(updates);
    await repository.createAuditLog(trx, {
      actor_id: actor.id,
      actor_role: actor.role,
      action: "book.admin_update",
      target_type: "book",
      target_id: id,
      old_value: JSON.stringify({ title: book.title, status: book.status }),
      new_value: JSON.stringify(updates),
    });
    return { id: book.id, ...updates };
  });
}

async function updateBookStatus(actor, id, input) {
  return repository.db.transaction(async (trx) => {
    const book = await repository.findBook(trx, id, true);
    if (!book || book.status === "deleted") {
      throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
    }
    const updates = {
      status: input.status,
      reject_reason: input.status === "rejected" ? input.reason : null,
      ...(input.status === "published" ? { published_at: trx.fn.now() } : {}),
    };
    await trx("books").where({ id }).update(updates);
    await repository.createAuditLog(trx, {
      actor_id: actor.id,
      actor_role: actor.role,
      action: "book.admin_status",
      target_type: "book",
      target_id: id,
      old_value: JSON.stringify({ status: book.status }),
      new_value: JSON.stringify({
        status: input.status,
        reason: input.reason || null,
      }),
    });
    return { id: book.id, status: input.status };
  });
}

async function deleteBook(actor, id) {
  return repository.db.transaction(async (trx) => {
    const book = await repository.findBook(trx, id, true);
    if (!book || book.status === "deleted") {
      throw new ApiError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");
    }
    await trx("books").where({ id }).update({
      status: "deleted",
      deleted_at: trx.fn.now(),
    });
    const chapterIds = await trx("chapters")
      .where({ book_id: id })
      .select("id");
    const targetIds = [id, ...chapterIds.map((chapter) => chapter.id)];
    await trx("moderation_requests")
      .where({ status: "pending" })
      .where((query) =>
        query.where({ target_type: "book", target_id: id }).orWhere((nested) =>
          nested.where({ target_type: "chapter" }).whereIn(
            "target_id",
            chapterIds.map((chapter) => chapter.id),
          ),
        ),
      )
      .update({
        status: "rejected",
        admin_note: "Nội dung đã được quản trị viên xóa mềm",
        reviewed_by: actor.id,
        reviewed_at: trx.fn.now(),
      });
    await repository.createAuditLog(trx, {
      actor_id: actor.id,
      actor_role: actor.role,
      action: "book.admin_delete",
      target_type: "book",
      target_id: id,
      old_value: JSON.stringify({ status: book.status }),
      new_value: JSON.stringify({
        status: "deleted",
        deletedAt: new Date().toISOString(),
        affectedTargets: targetIds.length,
      }),
    });
    return { id: book.id, status: "deleted" };
  });
}

module.exports = {
  listAccounts,
  updateAccountStatus,
  deleteAccount,
  listBooks,
  getBook,
  updateBook,
  updateBookStatus,
  deleteBook,
};
