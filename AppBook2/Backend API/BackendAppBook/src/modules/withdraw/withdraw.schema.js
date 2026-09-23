const { z } = require("zod");

const createWithdrawSchema = z.object({
  bankAccountId: z.coerce.number().int().positive(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

const rejectSchema = z.object({
  rejectReason: z.string().trim().min(1).max(500),
});

const completeSchema = z.object({
  transferRef: z.string().trim().min(1).max(100),
});

module.exports = { createWithdrawSchema, rejectSchema, completeSchema };
