import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanish = z
  .string()
  .optional()
  .transform((value) => value === "true" || value === "1");

const rawSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  // Some shells export PORT=0; treat that as "use the default" while still
  // allowing the platform to supply a real port.
  PORT: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(5000)
    .transform((port) => (port === 0 ? 5000 : port)),

  // Comma-separated list of allowed browser origins.
  FRONTEND_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  API_URL: z.string().url().optional(),
  ALLOW_VERCEL_PREVIEWS: booleanish,

  // Mongo accepts MONGODB_URI (preferred) or the legacy MONGODB_URL.
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_URL: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(16).optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  UPDATE_PASSWORD_BASE_URL: z.string().url().optional(),

  // Email is optional in development/test so the API can boot without Resend.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("onboarding@resend.dev"),
  EMAIL_FROM_NAME: z.string().default("Nextdemy"),
  CONTACT_MAIL: z.string().email().optional(),

  // Media storage is optional for the demo; upload routes fail clearly when unset.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  FOLDER_NAME: z.string().default("nextdemy"),
  FOLDER_VIDEO: z.string().default("nextdemy/videos"),

  // Payments: mock is the only enabled mode. Live requires a real provider.
  PAYMENT_MODE: z.enum(["mock", "live"]).default("mock"),
  PAYMENT_MOCK_OUTCOME: z
    .enum(["success", "failure", "cancel"])
    .default("success"),
  PAYMENT_MOCK_SECRET: z.string().min(16).optional(),
  PAYMENT_CURRENCY: z.string().regex(/^[A-Z]{3}$/).default("EGP"),

  COOKIE_SAME_SITE: z.enum(["lax", "none", "strict"]).default("lax"),
  TRUST_PROXY: z.string().default("1"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = rawSchema.parse(process.env);

const mongoUri = parsed.MONGODB_URI ?? parsed.MONGODB_URL;
if (!mongoUri) {
  throw new Error(
    "MONGODB_URI is required. Add the MongoDB Atlas connection string to the API environment."
  );
}

const frontendUrl =
  parsed.FRONTEND_URL ?? parsed.CORS_ORIGIN ?? "http://localhost:3000";

const allowedOrigins = [
  frontendUrl,
  ...(parsed.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(parsed.CORS_ORIGIN && parsed.CORS_ORIGIN !== frontendUrl
    ? [parsed.CORS_ORIGIN]
    : []),
].filter((origin, index, list) => list.indexOf(origin) === index);

const trustProxyValue = parsed.TRUST_PROXY;
const trustProxy =
  trustProxyValue === "true"
    ? true
    : trustProxyValue === "false"
      ? false
      : Number(trustProxyValue);

if (parsed.PAYMENT_MODE === "live") {
  throw new Error(
    "PAYMENT_MODE=live is disabled until a real payment provider is implemented and reviewed. Keep PAYMENT_MODE=mock."
  );
}

const cloudinaryEnabled = Boolean(
  parsed.CLOUDINARY_CLOUD_NAME &&
    parsed.CLOUDINARY_API_KEY &&
    parsed.CLOUDINARY_API_SECRET
);

const env = {
  ...parsed,
  MONGODB_URI: mongoUri,
  FRONTEND_URL: frontendUrl,
  UPDATE_PASSWORD_BASE_URL:
    parsed.UPDATE_PASSWORD_BASE_URL ?? `${frontendUrl}/update-password`,
  CONTACT_MAIL: parsed.CONTACT_MAIL ?? parsed.EMAIL_FROM,
  PAYMENT_MOCK_SECRET:
    parsed.PAYMENT_MOCK_SECRET ?? parsed.JWT_ACCESS_SECRET,
  ALLOWED_ORIGINS: allowedOrigins,
  TRUST_PROXY: trustProxy,
  CLOUDINARY_ENABLED: cloudinaryEnabled,
  IS_PRODUCTION: parsed.NODE_ENV === "production",
  PAYMENT_CURRENCY: parsed.PAYMENT_CURRENCY.toUpperCase(),
};

export type Env = typeof env;
export default env;
