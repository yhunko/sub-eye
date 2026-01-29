import { clerkMiddleware } from "@hono/clerk-auth";
import type { MiddlewareHandler } from "hono";

const publicRoutePrefixes = ["/api/webhooks"];

const isPublicRoute = (path: string) =>
  publicRoutePrefixes.some((prefix) => path.startsWith(prefix));

type ClerkAuthContext = {
  userId?: string | null;
};

export const clerkAuth = clerkMiddleware();

export const protect: MiddlewareHandler = async (context, next) => {
  if (context.req.method === "OPTIONS" || isPublicRoute(context.req.path)) {
    return next();
  }

  const auth = context.get("auth") as ClerkAuthContext | undefined;

  if (!auth?.userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  return next();
};
