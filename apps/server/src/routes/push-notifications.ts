import { vValidator } from "@hono/valibot-validator";
import { PushSubscriptionSchema } from "@subeye/shared";
import { Hono } from "hono";
import { object } from "valibot";
import { PushNotificationContent } from "../domains/push-notification/pushNotificationContent";
import { PushNotificationService } from "../domains/push-notification/pushNotificationService";
import { UserService } from "../domains/user/userService";
import type { Bindings } from "../env";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";

export const pushNotificationRouter = new Hono<{ Bindings: Bindings }>()
  .post(
    "/subscribe",
    protect,
    vValidator("json", PushSubscriptionSchema),
    async (context) => {
      const userId = requireUserId(context);
      const { endpoint, keys } = context.req.valid("json");

      await PushNotificationService.subscribe(
        userId,
        endpoint,
        keys.p256dh,
        keys.auth,
      );

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
      await PushNotificationService.unsubscribe(userId, endpoint);
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
