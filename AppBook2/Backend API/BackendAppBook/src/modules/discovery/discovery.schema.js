const { z } = require("zod");

const discoveryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  categoryIds: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine(
      (value) =>
        !value || value.split(",").every((item) => /^\d+$/.test(item.trim())),
      { message: "categoryIds phải là danh sách ID phân cách bằng dấu phẩy" },
    ),
});

module.exports = { discoveryQuerySchema };
