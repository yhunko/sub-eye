import type { SvixWebhookEvent } from "../../../middleware/svixVerification";

/**
 * Clerk-specific webhook event payload.
 *
 * Extend the `data` field per event type as needed.
 * Clerk event types reference: https://clerk.com/docs/integrations/webhooks/overview
 */
export interface ClerkWebhookEvent extends SvixWebhookEvent {
  data: { id: string; [key: string]: unknown };
  type: ClerkEventType;
}

/**
 * Supported Clerk webhook event types.
 *
 * Add new entries here when subscribing to additional events in
 * the Clerk Dashboard – the compiler will guide you to handle them.
 */
export type ClerkEventType = "user.deleted";

/** Hono env shape shared by all Clerk webhook routes. */
export type ClerkWebhookEnv = {
  Bindings: { CLERK_WEBHOOK_SECRET: string };
  Variables: { webhookEvent: ClerkWebhookEvent };
};
