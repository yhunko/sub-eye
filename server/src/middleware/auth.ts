import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import type { MiddlewareHandler } from "hono";

const publicRoutePrefixes = ["/api/webhooks"];

const isPublicRoute = (path: string) =>
  publicRoutePrefixes.some((prefix) => path.startsWith(prefix));

export const clerkAuth = clerkMiddleware();

export const protect: MiddlewareHandler = async (context, next) => {
  if (context.req.method === "OPTIONS" || isPublicRoute(context.req.path)) {
    return next();
  }

  const auth = getAuth(context);

  if (!auth?.userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  context.set("userId", auth.userId);
  context.set("orgId", auth.orgId ?? null);
  context.set("orgRole", auth.orgRole ?? null);

  return next();
};
