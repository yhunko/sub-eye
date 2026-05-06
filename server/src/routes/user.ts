import { vValidator } from "@hono/valibot-validator";
import type { Context } from "hono";
import { Hono } from "hono";
import { UpdateUserPublicMetadataSchema } from "shared";
import { SubscriptionSchedulingService } from "../domains/subscription/subscriptionSchedulingService";
import { UserService } from "../domains/user/userService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";

const NOTIFICATION_RELEVANT_FIELDS = [
  "notificationTime",
  "notificationOffset",
  "preferredTimezone",
  "expiryNotificationsEnabled",
  "expiryNotificationIntervals",
] as const;

const handleServiceError = (context: Context, error: unknown) => {
  if (error instanceof Error) {
    if (error.message === "User not found") {
      return context.json({ error: error.message }, 404);
    }
  }

  if (error instanceof Error) {
    return context.json(
      { error: "Database Error", message: error.message },
      500,
    );
  }

  return context.json({ error: "Internal Server Error" }, 500);
};

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
