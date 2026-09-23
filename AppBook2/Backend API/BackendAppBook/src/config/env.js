const { z } = require("zod");

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default("/api"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default("123456"),
  DB_NAME: z.string().default("web_sach"),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default("development-access-secret-change-me"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default("development-refresh-secret-change-me"),
  JWT_ACCESS_MINUTES: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default("http://localhost:3001"),
  KYC_ENCRYPTION_KEY: z
    .string()
    .min(32)
    .default("development-kyc-encryption-key-change-me"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment configuration:",
    result.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const env = result.data;

if (
  env.NODE_ENV === "production" &&
  env.JWT_ACCESS_SECRET.includes("change-me")
) {
  throw new Error("JWT_ACCESS_SECRET must be configured in production");
}

module.exports = {
  ...env,
  corsOrigins: env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
