const { z } = require("zod");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

const statsQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    bookId: z.coerce.number().int().positive().optional(),
    accountId: z.coerce.number().int().positive().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "Khoảng ngày không hợp lệ",
    path: ["to"],
  });

module.exports = { statsQuerySchema };
