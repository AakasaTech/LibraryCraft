import { z } from "zod";

// Empty strings in .env mean "not set".
const optional = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  DATABASE_URL: z.url(),
  DIRECT_URL: optional,

  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: optional,
  AUTH_GOOGLE_SECRET: optional,
  // "1" prints magic links to the server log instead of emailing them. For e2e under `next start`; never in production.
  AUTH_EMAIL_TO_CONSOLE: optional,

  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("LibraryCraft <hello@librarycraft.aakasa.dev>"),

  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optional,
  STRIPE_PRICE_PRO_MONTHLY: optional,
  STRIPE_PRICE_PRO_YEARLY: optional,
  STRIPE_PRICE_FAMILY_MONTHLY: optional,
  STRIPE_PRICE_FAMILY_YEARLY: optional,
  STRIPE_PRICE_ORG_MONTHLY: optional,
  STRIPE_PRICE_ORG_YEARLY: optional,

  GOOGLE_BOOKS_API_KEY: optional,

  S3_ENDPOINT: optional,
  S3_REGION: optional,
  S3_BUCKET: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  NEXT_PUBLIC_COVERS_BASE_URL: optional,

  LLM_API_URL: optional,
  LLM_API_KEY: optional,
  LLM_VISION_MODEL: optional,

  CRON_SECRET: optional,
  SENTRY_DSN: optional,
});

export const env = schema.parse(process.env);
