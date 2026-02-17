import type { Context, Next, MiddlewareHandler } from "hono";
import { Webhook } from "svix";

/**
 * Generic Svix webhook event envelope.
 *
 * Consumers should narrow the `data` / `type` fields via their own
 * domain-specific interfaces (e.g. `ClerkWebhookEvent`).
 */
export interface SvixWebhookEvent {
  data: Record<string, unknown>;
  object: string;
  type: string;
}

/**
 * Creates a reusable Hono middleware that verifies incoming Svix webhook
 * signatures.
 *
 * On success the parsed event is stored in the Hono context variable
 * whose key equals `variableKey` (defaults to `"webhookEvent"`).
 *
 * @param secretEnvKey  – name of the binding that holds the signing secret
 * @param variableKey   – context variable name for the verified payload
 */
export const svixVerification = <
  TEnv extends Record<string, string> = Record<string, string>,
>(
  secretEnvKey: keyof TEnv & string,
  variableKey = "webhookEvent",
): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const signingSecret = (c.env as TEnv)[secretEnvKey];

    if (!signingSecret) {
      throw new Error(`Missing ${secretEnvKey} – add it to your .env file`);
    }

    const svixId = c.req.header("svix-id");
    const svixTimestamp = c.req.header("svix-timestamp");
    const svixSignature = c.req.header("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return c.text("Error: Missing Svix headers", 400);
    }

    const body = await c.req.text();

    try {
      const event = new Webhook(signingSecret).verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as SvixWebhookEvent;

      c.set(variableKey, event);
    } catch (err) {
      console.error(`[Webhook] Verification failed (${secretEnvKey}):`, err);
      return c.text("Error: Verification error", 400);
    }

    await next();
  };
};
