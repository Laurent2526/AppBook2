const { z } = require("zod");

const createRefundSchema = z.object({
  transactionId: z.coerce.number().int().positive(),
  chapterId: z.coerce.number().int().positive(),
  reason: z.enum([
    "display_error",
    "duplicate_content",
    "removed_content",
    "wrong_purchase",
    "other",
  ]),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
});

const decisionSchema = z.object({
  adminNote: z.string().trim().max(500).optional().or(z.literal("")),
});

module.exports = { createRefundSchema, decisionSchema };
