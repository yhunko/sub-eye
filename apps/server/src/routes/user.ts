import { vValidator } from "@hono/valibot-validator";
import { UpdateUserPreferencesSchema } from "@subeye/shared";
import { Hono } from "hono";
import { UserService } from "../domains/user/userService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";

export const userRouter = new Hono()
  .get("/preferences", protect, async (context) => {
    const userId = requireUserId(context);

    return context.json(await UserService.getUserPreferences(userId));
  })
  .patch(
    "/preferences",
    protect,
    vValidator("json", UpdateUserPreferencesSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const preferences = await UserService.updateUserPreferences(
          userId,
          context.req.valid("json"),
        );

        return context.json(preferences);
      } catch (error) {
        console.error("[user] failed to update preferences", error);
        return context.json({ error: "Failed to update preferences" }, 400);
      }
    },
  );
