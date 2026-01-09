import { verifyWebhook } from "@clerk/nextjs/webhooks";
import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";
import { SubscriptionController } from "@/entities/subscription/lib/subscription.controller";
import { PushNotificationsRepository } from "@/entities/push-notifications/repository/push-notifications.repository";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    const { id: userId } = evt.data;

    if (!userId) {
      return new Response("Missing User ID", { status: 400 });
    }

    const controller = new SubscriptionController(userId);
    await controller.deleteAllForCurrentUser();
    const notificationsRepository = new PushNotificationsRepository();
    await notificationsRepository.deleteByUserId(userId);

    return new Response("User cleanup successful", { status: 200 });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { mechanism: "clerk-webhook-user-deleted" },
    });

    return new Response("Error processing webhook", { status: 500 });
  }
}
