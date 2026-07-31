import { clerkMiddleware, getAuth } from "@clerk/hono";
import type { MiddlewareHandler } from "hono";
import { apiErrorBody } from "../utils/routeUtils";

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
    return context.json(apiErrorBody("UNAUTHORIZED", "Unauthorized"), 401);
  }

  context.set("userId", auth.userId);

  return next();
};
