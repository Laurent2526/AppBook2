const { z } = require("zod");

const bankSchema = z.object({
  bankCode: z.string().trim().min(2).max(20),
  bankName: z.string().trim().min(2).max(150),
  branch: z.string().trim().max(150).optional(),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,50}$/),
  accountHolder: z.string().trim().min(2).max(150),
  isDefault: z.boolean().default(false),
});

module.exports = { bankSchema };
