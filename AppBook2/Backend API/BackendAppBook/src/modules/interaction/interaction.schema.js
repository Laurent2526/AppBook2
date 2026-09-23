const { z } = require("zod");

const bookIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const ratingSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
});

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  chapterId: z.coerce.number().int().positive().optional(),
  parentId: z.coerce.number().int().positive().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

const commentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  bookIdSchema,
  ratingSchema,
  createCommentSchema,
  updateCommentSchema,
  commentIdSchema,
};
