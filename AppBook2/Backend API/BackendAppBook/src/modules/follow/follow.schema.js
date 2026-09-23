const { z } = require("zod");

const followSchema = z.object({
  targetType: z.enum(["account", "book"]),
  targetId: z.coerce.number().int().positive(),
});

const readingHistorySchema = z.object({
  lastChapterId: z.coerce.number().int().positive().optional(),
  progressPercent: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  scrollPosition: z.coerce.number().int().nonnegative().optional(),
  chaptersRead: z.coerce.number().int().nonnegative().optional(),
  totalReadTime: z.coerce.number().int().nonnegative().optional(),
});

module.exports = { followSchema, readingHistorySchema };
