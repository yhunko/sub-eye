import webpush from "web-push";
import { PushNotificationRepository } from "./pushNotificationRepository";
import type { PushNotificationPayload } from "@shared/domains/subscription/subscriptionSchemas";

if (
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export class PushNotificationService {
  /**
   * Send a notification to all devices of a user.
   * Handles 410 (Gone) and 404 (Not Found) by cleaning up the subscription.
   */
  static async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<void> {
    const subscriptions = await PushNotificationRepository.findByUserId(userId);

    if (subscriptions.length === 0) {
      return;
    }

    const payloadString = JSON.stringify(payload);

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const details = webpush.generateRequestDetails(
          pushSubscription,
          payloadString,
        );

        const response = await fetch(details.endpoint, {
          method: "POST",
          headers: details.headers,
          body: details.body as any,
        });

        if (!response.ok) {
          throw new Error(
            `Web Push Error: ${response.status} ${response.statusText}`,
          );
        }
      } catch (error) {
        // If the subscription is invalid/expired (410 or 404), remove it.
        const isGone =
          error instanceof Error &&
          (error.message.includes("410") || error.message.includes("404"));

        if (isGone) {
          console.log(`Removing invalid subscription for user ${userId}`);
          await PushNotificationRepository.deleteByEndpoint(sub.endpoint);
        } else {
          console.error(
            `Failed to send notification to user ${userId}:`,
            error,
          );
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }
}
