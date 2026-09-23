const db = require("../../config/db");

async function findActiveAccount(trx, accountId) {
  return trx("accounts")
    .where({ id: accountId, status: "active" })
    .whereNull("deleted_at")
    .first();
}

async function findConversationByUsers(
  trx,
  userAId,
  userBId,
  forUpdate = false,
) {
  const userA = Math.min(Number(userAId), Number(userBId));
  const userB = Math.max(Number(userAId), Number(userBId));
  const query = trx("conversations").where({
    user_a_id: userA,
    user_b_id: userB,
  });
  if (forUpdate) query.forUpdate();
  return query.first();
}

async function findConversationForUser(
  trx,
  conversationId,
  accountId,
  forUpdate = false,
) {
  const query = trx("conversations")
    .where({ id: conversationId })
    .where((builder) =>
      builder.where("user_a_id", accountId).orWhere("user_b_id", accountId),
    );
  if (forUpdate) query.forUpdate();
  return query.first();
}

async function createConversation(trx, userAId, userBId) {
  const [id] = await trx("conversations").insert({
    user_a_id: Math.min(Number(userAId), Number(userBId)),
    user_b_id: Math.max(Number(userAId), Number(userBId)),
  });
  return trx("conversations").where({ id }).first();
}

async function listConversations(accountId) {
  return db("conversations as conversations")
    .leftJoin("accounts as other", function joinOther() {
      this.on(function selectOther() {
        this.on("other.id", "=", "conversations.user_a_id").andOn(
          "conversations.user_b_id",
          "=",
          db.raw("?", [accountId]),
        );
      }).orOn(function selectOtherB() {
        this.on("other.id", "=", "conversations.user_b_id").andOn(
          "conversations.user_a_id",
          "=",
          db.raw("?", [accountId]),
        );
      });
    })
    .select(
      "conversations.id",
      "conversations.user_a_id",
      "conversations.user_b_id",
      "conversations.last_message_id",
      "conversations.last_message_at",
      "conversations.created_at",
      "other.id as other_account_id",
      "other.username as other_username",
    )
    .where((builder) =>
      builder
        .where("conversations.user_a_id", accountId)
        .orWhere("conversations.user_b_id", accountId),
    )
    .orderByRaw(
      "conversations.last_message_at IS NULL, conversations.last_message_at DESC",
    )
    .orderBy("conversations.created_at", "desc");
}

async function findBlock(trx, blockerId, blockedId) {
  return trx("user_blocks")
    .where({ blocker_id: blockerId, blocked_id: blockedId })
    .first();
}

async function createBlock(trx, data) {
  const [id] = await trx("user_blocks").insert(data);
  return trx("user_blocks").where({ id }).first();
}

async function deleteBlock(trx, blockerId, blockedId) {
  return trx("user_blocks")
    .where({ blocker_id: blockerId, blocked_id: blockedId })
    .delete();
}

async function createMessage(trx, data) {
  const [id] = await trx("messages").insert(data);
  await trx("conversations")
    .where({ id: data.conversation_id })
    .update({ last_message_id: id, last_message_at: trx.fn.now() });
  return trx("messages").where({ id }).first();
}

async function listMessages(conversationId) {
  return db("messages")
    .select(
      "id",
      "conversation_id",
      "sender_id",
      "receiver_id",
      "content",
      "message_type",
      "attachment_url",
      "is_read",
      "read_at",
      "created_at",
    )
    .where({ conversation_id: conversationId })
    .whereNull("deleted_at")
    .orderBy("created_at", "asc");
}

async function markMessageRead(messageId, receiverId) {
  const updated = await db("messages")
    .where({ id: messageId, receiver_id: receiverId })
    .whereNull("deleted_at")
    .update({ is_read: 1, read_at: db.fn.now() });
  return updated > 0;
}

async function createNotification(data) {
  const [id] = await db("notifications").insert(data);
  return db("notifications").where({ id }).first();
}

async function listNotifications(accountId) {
  return db("notifications")
    .select(
      "id",
      "account_id",
      "type",
      "title",
      "content",
      "ref_type",
      "ref_id",
      "is_read",
      "read_at",
      "pushed_at",
      "created_at",
    )
    .where({ account_id: accountId })
    .orderBy("created_at", "desc");
}

async function countUnreadNotifications(accountId) {
  const result = await db("notifications")
    .where({ account_id: accountId, is_read: 0 })
    .count({ count: "id" })
    .first();
  return Number(result.count || 0);
}

async function markNotificationRead(notificationId, accountId) {
  const updated = await db("notifications")
    .where({ id: notificationId, account_id: accountId })
    .where({ is_read: 0 })
    .update({ is_read: 1, read_at: db.fn.now() });
  return updated > 0;
}

module.exports = {
  findActiveAccount,
  findConversationByUsers,
  findConversationForUser,
  createConversation,
  listConversations,
  findBlock,
  createBlock,
  deleteBlock,
  createMessage,
  listMessages,
  markMessageRead,
  createNotification,
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
};
