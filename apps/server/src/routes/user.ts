import { vValidator } from "@hono/valibot-validator";
import { UpdateUserPublicMetadataSchema } from "@subeye/shared";
import { Hono } from "hono";
import { SubscriptionSchedulingService } from "../domains/subscription/subscriptionSchedulingService";
import { UserService } from "../domains/user/userService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { handleServiceError } from "../utils/routeUtils";

const NOTIFICATION_RELEVANT_FIELDS = [
  "notificationTime",
  "notificationOffset",
  "preferredTimezone",
  "expiryNotificationsEnabled",
  "expiryNotificationIntervals",
] as const;

export const userRouter = new Hono().patch(
  "/public-metadata",
  protect,
  vValidator("json", UpdateUserPublicMetadataSchema),
  async (context) => {
    const userId = requireUserId(context);

    try {
      const payload = context.req.valid("json");
      const preferences = await UserService.updateUserPublicMetadata(
        userId,
        payload,
      );

      const needsReschedule = NOTIFICATION_RELEVANT_FIELDS.some(
        (field) => payload[field] !== undefined,
      );

      if (needsReschedule) {
        await SubscriptionSchedulingService.rescheduleUserNotifications(userId);
      }

      return context.json(preferences);
    } catch (error) {
      return handleServiceError(context, error);
    }
  },
);
