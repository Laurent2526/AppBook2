const {
  receiverSchema,
  conversationIdSchema,
  messageSchema,
  userIdSchema,
  blockSchema,
  messageIdSchema,
  notificationIdSchema,
  expoPushTokenSchema,
} = require("./messaging.schema");
const service = require("./messaging.service");

async function createConversation(req, res, next) {
  try {
    const { receiverId } = receiverSchema.parse(req.body);
    const result = await service.createConversation(req.auth.sub, receiverId);
    res.status(result.created ? 201 : 200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function listConversations(req, res, next) {
  try {
    const items = await service.listConversations(req.auth.sub);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { id } = conversationIdSchema.parse(req.params);
    const message = await service.sendMessage(
      req.auth.sub,
      id,
      messageSchema.parse(req.body),
    );
    res.status(201).json({ success: true, data: { message } });
  } catch (error) {
    next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const { id } = conversationIdSchema.parse(req.params);
    const items = await service.listMessages(req.auth.sub, id);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

async function markMessageRead(req, res, next) {
  try {
    const { id } = messageIdSchema.parse(req.params);
    const result = await service.markMessageRead(req.auth.sub, id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function block(req, res, next) {
  try {
    const { id } = userIdSchema.parse(req.params);
    const { reason } = blockSchema.parse(req.body);
    const item = await service.block(req.auth.sub, id, reason);
    res.status(201).json({ success: true, data: { block: item } });
  } catch (error) {
    next(error);
  }
}

async function unblock(req, res, next) {
  try {
    const { id } = userIdSchema.parse(req.params);
    const result = await service.unblock(req.auth.sub, id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const items = await service.listNotifications(req.auth.sub);
    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
}

async function unreadNotificationCount(req, res, next) {
  try {
    const count = await service.unreadNotificationCount(req.auth.sub);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { id } = notificationIdSchema.parse(req.params);
    const result = await service.markNotificationRead(req.auth.sub, id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function registerPushToken(req, res, next) {
  try {
    const { token } = expoPushTokenSchema.parse(req.body);
    await service.registerPushToken(req.auth.sub, req.account.sessionId, token);
    res.json({ success: true, data: { registered: true } });
  } catch (error) {
    next(error);
  }
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
};
