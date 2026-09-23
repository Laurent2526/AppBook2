const { z } = require("zod");

const createKycSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  idNumber: z.string().trim().min(6).max(50),
  idFrontUrl: z.string().url().max(500),
  idBackUrl: z.string().url().max(500),
  selfieUrl: z.string().url().max(500).optional(),
  taxCode: z.string().trim().max(30).optional(),
});

const reviewKycSchema = z.object({
  approved: z.boolean(),
  rejectReason: z.string().trim().max(255).optional(),
});

module.exports = { createKycSchema, reviewKycSchema };
