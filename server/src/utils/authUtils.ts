import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export const requireUserId = (context: Context): string => {
  const userId = context.get("userId");

  if (typeof userId !== "string") {
    throw new HTTPException(401, {
      res: context.json({ error: "Unauthorized" }, 401),
    });
  }

  return userId;
};
