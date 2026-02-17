import type { Context } from "hono";
import { SubscriptionService } from "../../../../domains/subscription/subscriptionService";
import { PushNotificationService } from "../../../../domains/push-notification/pushNotificationService";
import type { ClerkWebhookEnv } from "../types";

/**
 * Handles the `user.deleted` Clerk event.
 *
 * Removes all user-owned data (subscriptions and push-notification
 * registrations) in parallel.
 */
export const handleUserDeleted = async (c: Context<ClerkWebhookEnv>) => {
  // Type is scoped to `user.deleted` in Clerk dashboard
  const { data } = c.var.webhookEvent;

  const userId = data.id;
  console.log(`[Clerk Webhook] User deleted: ${userId}`);

  await Promise.all([
    SubscriptionService.deleteAllForUser(userId),
    PushNotificationService.deleteAllForUser(userId),
  ]);

  return c.text("Webhook received", 200);
};
