const { z } = require("zod");

const createBookmarkSchema = z.object({
  bookId: z.coerce.number().int().positive(),
  folder: z.string().trim().max(100).nullable().optional(),
});

const bookIdParamSchema = z.object({
  bookId: z.coerce.number().int().positive(),
});

module.exports = { createBookmarkSchema, bookIdParamSchema };
