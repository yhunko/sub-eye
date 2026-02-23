import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { PushSubscriptionSchema } from "shared";
import { PushNotificationRepository } from "../domains/push-notification/pushNotificationRepository";
import { object, string } from "valibot";

export const pushNotificationRouter = new Hono()
  .post(
    "/subscribe",
    protect,
    vValidator("json", PushSubscriptionSchema),
    async (context) => {
      const userId = requireUserId(context);
      const { endpoint, keys } = context.req.valid("json");

      await PushNotificationRepository.create({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      return context.json({ success: true }, 201);
    },
  )
  .post(
    "/unsubscribe",
    protect,
    vValidator("json", object({ endpoint: string() })),
    async (context) => {
      const { endpoint } = context.req.valid("json");
      await PushNotificationRepository.deleteByEndpoint(endpoint);
      return context.json({ success: true });
    },
  )
  .post("/test", protect, async (context) => {
    const userId = requireUserId(context);
    const { PushNotificationService } =
      await import("../domains/push-notification/pushNotificationService");

    const report = await PushNotificationService.sendNotification(userId, {
      title: "Test Notification",
      body: "If you see this, push notifications are working!",
      icon: "/assets/pwa/web-app-manifest-192x192.png",
      data: {
        url: "/settings/notifications",
      },
    });

    if (report.attempted > 0 && report.delivered === 0) {
      return context.json(
        {
          success: false,
          error: "Failed to deliver test notification to any subscription",
          report,
        },
        502,
      );
    }

    return context.json({ success: true, report });
  });
