const { z } = require("zod");

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
};

const listAccountsSchema = z.object({
  ...pagination,
  status: z.enum(["pending_verify", "active", "locked", "deleted"]).optional(),
  role: z.enum(["user", "support", "admin", "super_admin"]).optional(),
});

const updateAccountStatusSchema = z.object({
  status: z.enum(["active", "locked"]),
  reason: z.string().trim().max(255).optional(),
});

const listBooksSchema = z.object({
  ...pagination,
  status: z
    .enum([
      "draft",
      "pending",
      "published",
      "rejected",
      "hidden",
      "pending_delete",
      "deleted",
    ])
    .optional(),
});

const updateBookSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    authorName: z.string().trim().max(255).nullable().optional(),
    description: z.string().max(100000).nullable().optional(),
    writingStatus: z.enum(["ongoing", "completed", "paused"]).optional(),
    isMature: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Phải có ít nhất một trường cần cập nhật",
  });

const updateBookStatusSchema = z
  .object({
    status: z.enum(["published", "hidden", "rejected"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.status !== "rejected" || Boolean(value.reason), {
    message: "Cần có lý do khi từ chối nội dung",
    path: ["reason"],
  });

module.exports = {
  listAccountsSchema,
  updateAccountStatusSchema,
  listBooksSchema,
  updateBookSchema,
  updateBookStatusSchema,
};
