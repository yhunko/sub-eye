import type { Context } from "hono";
import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { UpdateUserPublicMetadataSchema } from "shared";
import { UserService } from "../domains/user/userService";
import { SubscriptionService } from "../domains/subscription/subscriptionService";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";

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

      // Reschedule notifications if relevant preferences changed
      // For now, we reschedule on any update to be safe
      await SubscriptionService.rescheduleUserNotifications(userId);

      return context.json(preferences);
    } catch (error) {
      return handleServiceError(context, error);
    }
  },
);
