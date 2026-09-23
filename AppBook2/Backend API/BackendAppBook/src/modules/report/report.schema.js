const { z } = require("zod");

const createReportSchema = z.object({
  targetType: z.enum(["book", "chapter", "comment", "account", "message"]),
  targetId: z.coerce.number().int().positive(),
  reason: z.enum([
    "copyright",
    "sensitive_content",
    "spam",
    "hate_speech",
    "harassment",
    "misinformation",
    "other",
  ]),
  description: z.string().trim().max(1000).optional(),
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
});

const reportIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const resolveReportSchema = z.object({
  actionTaken: z.enum([
    "none",
    "hidden",
    "deleted",
    "account_locked",
    "warning",
  ]),
  adminNote: z.string().trim().max(500).optional(),
});

const dismissReportSchema = z.object({
  adminNote: z.string().trim().max(500).optional(),
});

module.exports = {
  createReportSchema,
  reportIdSchema,
  resolveReportSchema,
  dismissReportSchema,
};
