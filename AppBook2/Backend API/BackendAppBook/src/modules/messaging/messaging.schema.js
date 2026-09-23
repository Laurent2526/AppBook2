const { z } = require("zod");

const receiverSchema = z.object({
  receiverId: z.coerce.number().int().positive(),
});

const conversationIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const messageSchema = z.object({
  content: z.string().trim().min(1).max(10000),
  messageType: z.enum(["text", "image", "book_share"]).default("text"),
  attachmentUrl: z.string().url().max(500).optional(),
});

const userIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const blockSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

const messageIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const notificationIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  receiverSchema,
  conversationIdSchema,
  messageSchema,
  userIdSchema,
  blockSchema,
  messageIdSchema,
  notificationIdSchema,
};
