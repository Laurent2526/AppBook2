const db = require("../../config/db");
const ApiError = require("../../utils/apiError");
const repository = require("./messaging.repository");
const realtime = require("./realtime");
const { sendPushToAccount } = require("./push.service");

async function assertNotBlocked(trx, firstId, secondId) {
  const blocked =
    (await repository.findBlock(trx, firstId, secondId)) ||
    (await repository.findBlock(trx, secondId, firstId));
  if (blocked) {
    throw new ApiError(
      403,
      "USER_BLOCKED",
      "Không thể tương tác với người dùng đã chặn",
    );
  }
}

async function createConversation(accountId, receiverId) {
  return db.transaction(async (trx) => {
    if (Number(accountId) === Number(receiverId)) {
      throw new ApiError(
        400,
        "INVALID_RECEIVER",
        "Không thể tạo hội thoại với chính mình",
      );
    }
    const receiver = await repository.findActiveAccount(trx, receiverId);
    if (!receiver) {
      throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy người nhận");
    }
    await assertNotBlocked(trx, accountId, receiverId);

    const existing = await repository.findConversationByUsers(
      trx,
      accountId,
      receiverId,
    );
    if (existing) return { conversation: existing, created: false };

    return {
      conversation: await repository.createConversation(
        trx,
        accountId,
        receiverId,
      ),
      created: true,
    };
  });
}

async function listConversations(accountId) {
  return repository.listConversations(accountId);
}

async function sendMessage(accountId, conversationId, input) {
  const result = await db.transaction(async (trx) => {
    const conversation = await repository.findConversationForUser(
      trx,
      conversationId,
      accountId,
      true,
    );
    if (!conversation) {
      throw new ApiError(
        403,
        "CONVERSATION_FORBIDDEN",
        "Bạn không thuộc hội thoại này",
      );
    }

    const receiverId =
      Number(conversation.user_a_id) === Number(accountId)
        ? conversation.user_b_id
        : conversation.user_a_id;
    await assertNotBlocked(trx, accountId, receiverId);

    const message = await repository.createMessage(trx, {
      conversation_id: conversationId,
      sender_id: accountId,
      receiver_id: receiverId,
      content: input.content,
      message_type: input.messageType,
      attachment_url: input.attachmentUrl || null,
    });
    return { message, receiverId };
  });

  realtime.emitToAccount(result.receiverId, "message:new", result.message);
  realtime.emitToAccount(accountId, "message:new", result.message);
  await createNotification({
    accountId: result.receiverId,
    type: "social",
    title: "Tin nhắn mới",
    content: "Bạn có tin nhắn mới.",
    refType: "none",
  });
  return result.message;
}

async function listMessages(accountId, conversationId) {
  const conversation = await repository.findConversationForUser(
    db,
    conversationId,
    accountId,
  );
  if (!conversation) {
    throw new ApiError(
      403,
      "CONVERSATION_FORBIDDEN",
      "Bạn không thuộc hội thoại này",
    );
  }
  return repository.listMessages(conversationId);
}

async function markMessageRead(accountId, messageId) {
  const updated = await repository.markMessageRead(messageId, accountId);
  if (!updated) {
    throw new ApiError(
      404,
      "MESSAGE_NOT_FOUND",
      "Không tìm thấy message cần đánh dấu đã đọc",
    );
  }
  return { read: true };
}

async function block(accountId, blockedId, reason) {
  return db.transaction(async (trx) => {
    if (Number(accountId) === Number(blockedId)) {
      throw new ApiError(
        400,
        "INVALID_BLOCK_TARGET",
        "Không thể tự chặn chính mình",
      );
    }
    const target = await repository.findActiveAccount(trx, blockedId);
    if (!target)
      throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy người dùng");
    if (await repository.findBlock(trx, accountId, blockedId)) {
      throw new ApiError(409, "ALREADY_BLOCKED", "Người dùng đã bị chặn");
    }
    return repository.createBlock(trx, {
      blocker_id: accountId,
      blocked_id: blockedId,
      reason: reason || null,
    });
  });
}

async function unblock(accountId, blockedId) {
  const deleted = await repository.deleteBlock(db, accountId, blockedId);
  if (!deleted)
    throw new ApiError(404, "BLOCK_NOT_FOUND", "Người dùng chưa bị chặn");
  return { deleted: true };
}

async function listNotifications(accountId) {
  return repository.listNotifications(accountId);
}

async function unreadNotificationCount(accountId) {
  return repository.countUnreadNotifications(accountId);
}

async function markNotificationRead(accountId, notificationId) {
  const updated = await repository.markNotificationRead(
    notificationId,
    accountId,
  );
  if (!updated) {
    throw new ApiError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Không tìm thấy notification",
    );
  }
  return { read: true };
}

async function registerPushToken(accountId, sessionId, token) {
  await repository.registerPushToken(accountId, sessionId, token);
  return { registered: true };
}

async function createNotification(input) {
  const notification = await repository.createNotification({
    account_id: input.accountId,
    type: input.type,
    title: input.title,
    content: input.content,
    ref_type: input.refType || "none",
    ref_id: input.refId || null,
  });
  realtime.emitToAccount(input.accountId, "notification:new", notification);
  try {
    await sendPushToAccount(input.accountId, notification);
  } catch (error) {
    console.warn("push notification delivery failed", error.message);
  }
  return notification;
}

module.exports = {
  createConversation,
  listConversations,
  sendMessage,
  listMessages,
  markMessageRead,
  block,
  unblock,
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  registerPushToken,
  createNotification,
};
