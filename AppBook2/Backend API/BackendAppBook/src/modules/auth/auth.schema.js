const { z } = require("zod");

const contactSchema = z
  .object({
    email: z.string().trim().email().max(150).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{8,20}$/)
      .optional(),
  })
  .refine(({ email, phone }) => Boolean(email || phone), {
    message: "Email hoặc phone là bắt buộc",
    path: ["email"],
  })
  .refine(({ email, phone }) => !(email && phone), {
    message: "Chỉ được đăng ký bằng email hoặc phone",
    path: ["email"],
  });

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_.-]+$/),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Za-z]/, "Mật khẩu phải có chữ")
      .regex(/[0-9]/, "Mật khẩu phải có số"),
    fullName: z.string().trim().max(150).optional(),
    channel: z.enum(["email", "sms"]),
  })
  .and(contactSchema)
  .superRefine((value, context) => {
    if (value.channel === "email" && !value.email) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["channel"],
        message: "Channel email yêu cầu email",
      });
    }
    if (value.channel === "sms" && !value.phone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["channel"],
        message: "Channel sms yêu cầu phone",
      });
    }
  });

const verifyOtpSchema = z.object({
  target: z.string().trim().min(1).max(150),
  code: z.string().regex(/^\d{6}$/, "OTP phải gồm 6 chữ số"),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(150),
  password: z.string().min(1).max(128),
  deviceId: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(150).optional(),
  platform: z.enum(["android", "ios", "web", "other"]).default("other"),
  appVersion: z.string().trim().max(30).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32),
});

module.exports = {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  refreshSchema,
};
