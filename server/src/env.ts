import * as v from "valibot";

/**
 * Valibot schema for all Cloudflare Worker bindings.
 * GitHub is the single source of truth — injected via `wrangler secret bulk`.
 *
 * GitHub vars  (plaintext, non-sensitive):
 *   BASE_URL, CLIENT_ORIGIN, CLERK_PUBLISHABLE_KEY, PADDLE_ENV,
 *   PADDLE_PLUS_PRODUCT_ID, POSTHOG_KEY, TELEGRAM_BOT_USERNAME,
 *   VAPID_PUBLIC_KEY, VAPID_SUBJECT
 *
 * GitHub secrets (encrypted, sensitive):
 *   CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, PADDLE_WEBHOOK_SECRET,
 *   PADDLE_API_KEY, GEMINI_API_KEY, DATABASE_URL, QSTASH_*, TELEGRAM_BOT_TOKEN,
 *   TELEGRAM_WEBHOOK_SECRET_TOKEN, PLANS_API_KEY, VAPID_PRIVATE_KEY
 */
export const BindingsSchema = v.object({
  BASE_URL: v.pipe(v.string(), v.url()),
  CLERK_SECRET_KEY: v.pipe(v.string(), v.minLength(1)),
  CLERK_PUBLISHABLE_KEY: v.pipe(v.string(), v.minLength(1)),
  CLERK_WEBHOOK_SECRET: v.pipe(v.string(), v.minLength(1)),
  PADDLE_WEBHOOK_SECRET: v.pipe(v.string(), v.minLength(1)),
  PADDLE_API_KEY: v.pipe(v.string(), v.minLength(1)),
  PADDLE_PLUS_PRODUCT_ID: v.pipe(v.string(), v.minLength(1)),
  PADDLE_ENV: v.picklist(["sandbox", "live"] as const),
  GEMINI_API_KEY: v.pipe(v.string(), v.minLength(1)),
  DATABASE_URL: v.pipe(v.string(), v.minLength(1)),
  QSTASH_URL: v.pipe(v.string(), v.url()),
  QSTASH_TOKEN: v.pipe(v.string(), v.minLength(1)),
  QSTASH_CURRENT_SIGNING_KEY: v.pipe(v.string(), v.minLength(1)),
  QSTASH_NEXT_SIGNING_KEY: v.pipe(v.string(), v.minLength(1)),
  TELEGRAM_BOT_TOKEN: v.pipe(v.string(), v.minLength(1)),
  TELEGRAM_BOT_USERNAME: v.pipe(v.string(), v.minLength(1)),
  TELEGRAM_WEBHOOK_SECRET_TOKEN: v.pipe(v.string(), v.minLength(1)),
  CLIENT_ORIGIN: v.pipe(v.string(), v.url()),
  POSTHOG_KEY: v.pipe(v.string(), v.minLength(1)),
  PLANS_API_KEY: v.pipe(v.string(), v.minLength(1)),
  VAPID_SUBJECT: v.pipe(v.string(), v.minLength(1)),
  VAPID_PUBLIC_KEY: v.pipe(v.string(), v.minLength(1)),
  VAPID_PRIVATE_KEY: v.pipe(v.string(), v.minLength(1)),
});
