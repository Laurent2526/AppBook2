const { z } = require("zod");

const paymentMethodSchema = z.enum([
  "vnpay",
  "momo",
  "zalopay",
  "bank_transfer",
  "card",
]);

const createTopupSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((value) => Number(value) > 0, {
      message: "Số tiền nạp phải lớn hơn 0",
    }),
  paymentMethod: paymentMethodSchema.default("vnpay"),
});

const demoTopupSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+$/, "Số tiền nạp phải là số nguyên VND")
    .refine((value) => Number(value) > 0, {
      message: "Số tiền nạp phải lớn hơn 0",
    }),
});

const webhookTopupSchema = z
  .object({
    code: z.string().trim().min(1).max(100).optional(),
    gatewayTxnId: z.string().trim().max(100).optional(),
    transactionId: z.string().trim().max(100).optional(),
    status: z.enum(["success", "failed", "cancelled"]).default("success"),
    amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    paymentMethod: paymentMethodSchema.optional(),
    paidAt: z.string().datetime().optional(),
  })
  .passthrough();

module.exports = {
  createTopupSchema,
  demoTopupSchema,
  webhookTopupSchema,
  paymentMethodSchema,
};
