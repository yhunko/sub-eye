import { vValidator } from "@hono/valibot-validator";
import { UpdateUserPublicMetadataSchema } from "@subeye/shared";
import { Hono } from "hono";
import { UserService } from "../domains/user/userService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { handleServiceError } from "../utils/routeUtils";

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

      return context.json(preferences);
    } catch (error) {
      return handleServiceError(context, error);
    }
  },
);
