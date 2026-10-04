const db = require("../../config/db");
const ApiError = require("../../utils/apiError");
const repository = require("./report.repository");

const contentTargets = new Set(["book", "chapter", "comment"]);
const moderatorRoles = new Set(["support", "admin", "super_admin"]);

function targetIsVisible(targetType, target) {
  if (targetType === "book" || targetType === "chapter") {
    return target.status === "published" && !target.deleted_at;
  }
  if (targetType === "comment") {
    return target.status === "visible" && !target.deleted_at;
  }
  return Boolean(target);
}

async function create(reporterId, input) {
  return db.transaction(async (trx) => {
    const target = await repository.findTarget(
      trx,
      input.targetType,
      input.targetId,
    );
    if (!target || !targetIsVisible(input.targetType, target)) {
      throw new ApiError(
        404,
        "REPORT_TARGET_NOT_FOUND",
        "Đối tượng report không tồn tại hoặc không hiển thị",
      );
    }

    const duplicate = await repository.findDuplicate(
      trx,
      reporterId,
      input.targetType,
      input.targetId,
    );
    if (duplicate) {
      throw new ApiError(
        409,
        "REPORT_ALREADY_EXISTS",
        "Bạn đã report đối tượng này",
      );
    }

    const report = await repository.createReport(trx, {
      reporter_id: reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      description: input.description || null,
      evidence_urls: input.evidenceUrls
        ? JSON.stringify(input.evidenceUrls)
        : null,
    });

    const openCount = await repository.countOpenReports(
      trx,
      input.targetType,
      input.targetId,
    );
    const setting = await repository.getSetting(trx, "auto_hide_report_count");
    const threshold = Number(setting?.setting_value || 10);

    if (
      openCount >= threshold &&
      contentTargets.has(input.targetType) &&
      targetIsVisible(input.targetType, target)
    ) {
      await repository.updateTarget(trx, input.targetType, input.targetId, {
        status: "hidden",
      });
      await repository.updateReport(trx, report.id, { action_taken: "hidden" });
      await repository.createAuditLog(trx, {
        actor_id: null,
        actor_role: "system",
        action: "content.auto_hide",
        target_type: input.targetType,
        target_id: input.targetId,
        old_value: JSON.stringify({ status: target.status }),
        new_value: JSON.stringify({ status: "hidden", reportCount: openCount }),
      });
    }

    return repository.findReport(trx, report.id);
  });
}

async function listQueue() {
  return repository.listQueue();
}

async function decide(admin, reportId, input, status) {
  return db.transaction(async (trx) => {
    const report = await repository.findReport(trx, reportId, true);
    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Không tìm thấy report");
    }
    if (!["pending", "reviewing"].includes(report.status)) {
      throw new ApiError(409, "REPORT_ALREADY_DECIDED", "Report đã được xử lý");
    }

    const target = await repository.findTarget(
      trx,
      report.target_type,
      report.target_id,
      true,
    );
    if (!target) {
      throw new ApiError(
        404,
        "REPORT_TARGET_NOT_FOUND",
        "Không tìm thấy đối tượng report",
      );
    }

    if (status === "resolved") {
      if (input.actionTaken === "account_locked") {
        if (report.target_type !== "account" || target.role !== "user") {
          throw new ApiError(
            409,
            "REPORT_TARGET_NOT_LOCKABLE",
            "Chỉ có thể khóa tài khoản người dùng thông thường từ báo cáo",
          );
        }
        if (target.status !== "active") {
          throw new ApiError(
            409,
            "REPORT_ACCOUNT_NOT_ACTIVE",
            "Tài khoản không còn ở trạng thái hoạt động",
          );
        }
        await trx("accounts").where({ id: report.target_id }).update({
          status: "locked",
          lock_reason: input.adminNote || "Khóa sau khi xử lý báo cáo",
          locked_at: trx.fn.now(),
          locked_by: admin.id,
          locked_until: null,
        });
        await trx("user_sessions")
          .where({ account_id: report.target_id })
          .whereNull("revoked_at")
          .update({
            revoked_at: trx.fn.now(),
            revoked_reason: "admin_lock",
          });
        await repository.createAuditLog(trx, {
          actor_id: admin.id,
          actor_role: admin.role,
          action: "account.lock",
          target_type: "account",
          target_id: report.target_id,
          old_value: JSON.stringify({ status: target.status }),
          new_value: JSON.stringify({
            status: "locked",
            reason: input.adminNote || "Khóa sau khi xử lý báo cáo",
            reportId: report.id,
          }),
        });
      }
      if (
        input.actionTaken === "hidden" &&
        contentTargets.has(report.target_type)
      ) {
        await repository.updateTarget(
          trx,
          report.target_type,
          report.target_id,
          {
            status: "hidden",
          },
        );
      }
      if (input.actionTaken === "deleted") {
        await repository.updateTarget(
          trx,
          report.target_type,
          report.target_id,
          {
            status: "deleted",
            deleted_at: trx.fn.now(),
          },
        );
      }
    }

    const updated = await repository.updateReport(trx, report.id, {
      status,
      action_taken: status === "resolved" ? input.actionTaken : "none",
      admin_note: input.adminNote || null,
      reviewed_by: admin.id,
      reviewed_at: trx.fn.now(),
    });

    await repository.createAuditLog(trx, {
      actor_id: admin.id,
      actor_role: admin.role,
      action: status === "resolved" ? "report.resolve" : "report.dismiss",
      target_type: report.target_type,
      target_id: report.target_id,
      old_value: JSON.stringify({ status: report.status }),
      new_value: JSON.stringify({
        status,
        actionTaken: updated.action_taken,
      }),
    });

    return updated;
  });
}

module.exports = { create, listQueue, decide };
