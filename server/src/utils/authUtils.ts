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

export const getOrgId = (context: Context): string | null => {
  const orgId = context.get("orgId");
  return typeof orgId === "string" ? orgId : null;
};

export const requireOrgAdmin = (context: Context): void => {
  const orgRole = context.get("orgRole");
  if (orgRole !== "org:admin") {
    throw new HTTPException(403, {
      res: context.json({ error: "Forbidden" }, 403),
    });
  }
};
