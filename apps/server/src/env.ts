import * as v from "valibot";

/**
 * Valibot schema for all Cloudflare Worker bindings.
 * GitHub is the single source of truth — injected via `wrangler secret bulk`.
 *
 * GitHub vars  (plaintext, non-sensitive):
 *   BASE_URL, CLIENT_ORIGIN, CLERK_PUBLISHABLE_KEY, POSTHOG_KEY
 *
 * GitHub secrets (encrypted, sensitive):
 *   CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, DATABASE_URL
 */
export const BindingsSchema = v.object({
  BASE_URL: v.pipe(v.string(), v.url()),
  CLERK_SECRET_KEY: v.pipe(v.string(), v.minLength(1)),
  CLERK_PUBLISHABLE_KEY: v.pipe(v.string(), v.minLength(1)),
  CLERK_WEBHOOK_SECRET: v.pipe(v.string(), v.minLength(1)),
  DATABASE_URL: v.pipe(v.string(), v.minLength(1)),
  CLIENT_ORIGIN: v.pipe(v.string(), v.url()),
  POSTHOG_KEY: v.pipe(v.string(), v.minLength(1)),
});

/** Derived from BindingsSchema — keeps the type and schema in sync automatically. */
export type Bindings = v.InferOutput<typeof BindingsSchema>;
