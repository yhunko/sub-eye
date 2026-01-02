import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { PushNotificationsRepository } from "@/entities/push-notifications/repository/push-notifications.repository";
import { PushNotificationsSchedulerService } from "@/entities/push-notifications/lib/push-notifications-scheduler.service";
import { SubscriptionRepository } from "@/entities/subscription/repository/subscription.repository";

webpush.setVapidDetails(
  "mailto:yegorgunko@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscriptionId, subscriptionName } = body;

    // Get user's push subscriptions
    const pushRepo = new PushNotificationsRepository();
    const pushSubscriptions = await pushRepo.findByUserId(userId);

    if (pushSubscriptions.length === 0) {
      return NextResponse.json(
        { error: "No push subscriptions found" },
        { status: 404 },
      );
    }

    // Send notifications to all user's devices
    await Promise.allSettled(
      pushSubscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: "Subscription Payment Reminder",
            body: `Your subscription "${subscriptionName}" is due soon`,
            // icon: "/icon.png",
            data: {
              subscriptionId,
              url: "/subscriptions",
            },
          }),
        ),
      ),
    );

    // Schedule the next notification for this subscription
    const subscriptionRepo = new SubscriptionRepository();
    const subscription = await subscriptionRepo.findById(subscriptionId);

    if (subscription) {
      const scheduler = new PushNotificationsSchedulerService();
      await scheduler.rescheduleForSubscription(subscription);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 },
    );
  }
}

export const POST = verifySignatureAppRouter(handler);
