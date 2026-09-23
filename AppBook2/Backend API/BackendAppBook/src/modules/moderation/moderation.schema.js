const { z } = require("zod");

const queueSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const decisionSchema = z.object({
  adminNote: z.string().trim().max(500).optional(),
});

module.exports = { queueSchema, decisionSchema };
