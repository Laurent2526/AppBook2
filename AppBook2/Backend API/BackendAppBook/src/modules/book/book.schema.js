const { z } = require("zod");

const listBooksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(255).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  writingStatus: z.enum(["ongoing", "completed", "paused"]).optional(),
  sortBy: z.enum(["latest", "hot"]).default("latest"),
});

const listMyBooksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z
    .enum([
      "pending",
      "published",
      "rejected",
      "draft",
      "deleted",
      "pending_delete",
    ])
    .optional(),
  search: z.string().trim().max(255).optional(),
});

const createBookSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(280)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  authorName: z.string().trim().max(255).optional(),
  coverPath: z.string().max(500).optional(),
  description: z.string().max(100000).optional(),
  categoryIds: z.array(z.number().int().positive()).min(1).max(10),
  writingStatus: z.enum(["ongoing", "completed", "paused"]).default("ongoing"),
  isMature: z.boolean().default(false),
  language: z.string().trim().length(2).default("vi"),
  freePreviewChapters: z.number().int().min(0).max(255).default(0),
});

const createChapterSchema = z
  .object({
    chapterNumber: z.number().int().positive(),
    title: z.string().trim().min(1).max(255),
    content: z.string().optional(),
    contentUrl: z.string().url().max(500).optional(),
    previewText: z.string().max(2000).optional(),
    isFree: z.boolean().default(true),
    price: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .default("0.00"),
  })
  .superRefine((value, context) => {
    if (value.isFree && value.price !== "0.00" && value.price !== "0") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Chương miễn phí phải có giá 0",
      });
    }
    if (!value.isFree && Number(value.price) <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Chương trả phí phải có giá dương",
      });
    }
    if (!value.content && !value.contentUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Content hoặc contentUrl là bắt buộc",
      });
    }
  });

const updateBookSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    authorName: z.string().trim().max(255).nullable().optional(),
    coverPath: z.string().max(500).nullable().optional(),
    description: z.string().max(100000).nullable().optional(),
    categoryIds: z.array(z.number().int().positive()).min(1).max(10).optional(),
    writingStatus: z.enum(["ongoing", "completed", "paused"]).optional(),
    isMature: z.boolean().optional(),
    language: z.string().trim().length(2).optional(),
    freePreviewChapters: z.number().int().min(0).max(255).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Phải có ít nhất một trường cần cập nhật",
  });

const updateChapterSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    content: z.string().nullable().optional(),
    contentUrl: z.string().url().max(500).nullable().optional(),
    previewText: z.string().max(2000).nullable().optional(),
    isFree: z.boolean().optional(),
    price: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Phải có ít nhất một trường cần cập nhật",
  });

const deleteRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

module.exports = {
  listBooksSchema,
  listMyBooksSchema,
  createBookSchema,
  createChapterSchema,
  updateBookSchema,
  updateChapterSchema,
  deleteRequestSchema,
};
