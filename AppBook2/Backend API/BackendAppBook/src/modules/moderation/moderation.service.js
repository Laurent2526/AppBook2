const ApiError = require("../../utils/apiError");
const repository = require("./moderation.repository");

async function listQueue(input) {
  return repository.listQueue(input);
}

async function decide(admin, requestId, decision, approve) {
  return repository.db.transaction(async (trx) => {
    const moderation = await repository.findRequestForUpdate(trx, requestId);
    if (!moderation)
      throw new ApiError(
        404,
        "MODERATION_NOT_FOUND",
        "Không tìm thấy yêu cầu kiểm duyệt",
      );
    if (moderation.status !== "pending") {
      throw new ApiError(
        409,
        "MODERATION_ALREADY_DECIDED",
        "Yêu cầu kiểm duyệt đã được xử lý",
      );
    }

    const target = await repository.findTargetForUpdate(
      trx,
      moderation.target_type,
      moderation.target_id,
    );
    if (!target)
      throw new ApiError(
        404,
        "MODERATION_TARGET_NOT_FOUND",
        "Không tìm thấy nội dung cần kiểm duyệt",
      );

    const payload = moderation.payload
      ? typeof moderation.payload === "string"
        ? JSON.parse(moderation.payload)
        : moderation.payload
      : {};
    const isEdit = ["book_edit", "chapter_edit"].includes(
      moderation.request_type,
    );
    const isDelete = ["book_delete", "chapter_delete"].includes(
      moderation.request_type,
    );
    let nextStatus = target.status;

    if (approve && moderation.request_type === "book_edit") {
      const { category_ids: categoryIds, ...bookChanges } = payload;
      await repository.updateTarget(
        trx,
        "book",
        moderation.target_id,
        bookChanges,
      );
      if (categoryIds) {
        await trx("book_categories")
          .where({ book_id: moderation.target_id })
          .delete();
        await trx("book_categories").insert(
          categoryIds.map((categoryId) => ({
            book_id: moderation.target_id,
            category_id: categoryId,
          })),
        );
      }
    } else if (approve && moderation.request_type === "chapter_edit") {
      const version = await trx("chapter_versions")
        .where({ chapter_id: moderation.target_id })
        .max({ versionNo: "version_no" })
        .first();
      await trx("chapter_versions").insert({
        chapter_id: target.id,
        version_no: Number(version.versionNo || 0) + 1,
        title: target.title,
        content: target.content,
        content_url: target.content_url,
        price: target.price,
        word_count: target.word_count,
        edited_by: admin.id,
        edit_note: decision.adminNote || "Snapshot trước khi cập nhật",
      });
      await repository.updateTarget(
        trx,
        "chapter",
        moderation.target_id,
        payload,
      );
    } else if (approve && isDelete) {
      await repository.updateTarget(
        trx,
        moderation.target_type,
        moderation.target_id,
        {
          status: "deleted",
          deleted_at: trx.fn.now(),
        },
      );
      nextStatus = "deleted";
    } else if (approve) {
      nextStatus = "published";
      await repository.updateTarget(
        trx,
        moderation.target_type,
        moderation.target_id,
        {
          status: nextStatus,
          published_at: trx.fn.now(),
          reject_reason: null,
        },
      );

      if (
        moderation.request_type === "book_publish" &&
        moderation.target_type === "book"
      ) {
        const pendingChapters = await trx("chapters")
          .where({ book_id: moderation.target_id, status: "pending" })
          .select("id");
        const chapterIds = pendingChapters.map((chapter) => chapter.id);

        if (chapterIds.length) {
          await trx("chapters").whereIn("id", chapterIds).update({
            status: "published",
            published_at: trx.fn.now(),
            reject_reason: null,
          });
          await trx("moderation_requests")
            .whereIn("target_id", chapterIds)
            .where({
              request_type: "chapter_publish",
              target_type: "chapter",
              status: "pending",
            })
            .update({
              status: "approved",
              admin_note: decision.adminNote || null,
              reviewed_by: admin.id,
              reviewed_at: trx.fn.now(),
            });
        }
      }
    } else if (isDelete) {
      nextStatus = payload.previousStatus || "published";
      await repository.updateTarget(
        trx,
        moderation.target_type,
        moderation.target_id,
        {
          status: nextStatus,
          deleted_at: null,
        },
      );
    } else if (!isEdit) {
      nextStatus = "rejected";
      await repository.updateTarget(
        trx,
        moderation.target_type,
        moderation.target_id,
        {
          status: nextStatus,
          reject_reason:
            decision.adminNote || "Nội dung không đạt yêu cầu kiểm duyệt",
        },
      );
    }
    await repository.updateRequest(trx, moderation.id, {
      status: approve ? "approved" : "rejected",
      admin_note: decision.adminNote || null,
      reviewed_by: admin.id,
      reviewed_at: trx.fn.now(),
    });
    await repository.createAuditLog(trx, {
      actor_id: admin.id,
      actor_role: admin.role,
      action: approve ? "content.approve" : "content.reject",
      target_type: moderation.target_type,
      target_id: moderation.target_id,
      old_value: JSON.stringify({ status: target.status }),
      new_value: JSON.stringify({
        status: nextStatus,
        moderationRequestId: moderation.id,
      }),
    });

    return {
      moderationRequestId: moderation.id,
      targetType: moderation.target_type,
      targetId: moderation.target_id,
      status: nextStatus,
    };
  });
}

module.exports = { listQueue, decide };
