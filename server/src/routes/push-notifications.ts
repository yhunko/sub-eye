import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { PushSubscriptionSchema } from "shared";
import { PushNotificationRepository } from "../domains/push-notification/pushNotificationRepository";
import { object } from "valibot";
import { UserService } from "../domains/user/userService";
import { PushNotificationContent } from "../domains/push-notification/pushNotificationContent";
import { PushNotificationService } from "../domains/push-notification/pushNotificationService";
import type { Bindings } from "../env";

export const pushNotificationRouter = new Hono<{ Bindings: Bindings }>()
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
    vValidator(
      "json",
      object({
        endpoint: PushSubscriptionSchema.entries.endpoint,
      }),
    ),
    async (context) => {
      const userId = requireUserId(context);
      const { endpoint } = context.req.valid("json");
      await PushNotificationRepository.deleteByUserAndEndpoint(
        userId,
        endpoint,
      );
      return context.json({ success: true });
    },
  )
  .post("/test", protect, async (context) => {
    const userId = requireUserId(context);
    const preferences = await UserService.getUserPreferences(userId);

    const vapidDetails = {
      subject: context.env.VAPID_SUBJECT,
      publicKey: context.env.VAPID_PUBLIC_KEY,
      privateKey: context.env.VAPID_PRIVATE_KEY,
    };

    const report = await PushNotificationService.sendNotification(
      userId,
      PushNotificationContent.buildTestPayload(preferences.locale),
      vapidDetails,
    );

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
