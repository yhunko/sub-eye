import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { PushSubscriptionSchema } from "shared";
import { PushNotificationRepository } from "../domains/push-notification/pushNotificationRepository";
import { check, object, pipe, string } from "valibot";
import { UserService } from "../domains/user/userService";
import { PushNotificationContent } from "../domains/push-notification/pushNotificationContent";

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
    vValidator(
      "json",
      object({
        endpoint: pipe(
          string(),
          check(
            (value) => value.startsWith("https://"),
            "Push endpoint must use HTTPS",
          ),
        ),
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
    const { PushNotificationService } =
      await import("../domains/push-notification/pushNotificationService");

    const report = await PushNotificationService.sendNotification(
      userId,
      PushNotificationContent.buildTestPayload(preferences.locale),
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
