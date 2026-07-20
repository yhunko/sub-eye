import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./env";
import { clerkAuth } from "./middleware/auth";
import { analyticsRouter } from "./routes/analytics";
import { categoryRouter } from "./routes/categories";
import { subscriptionRouter } from "./routes/subscriptions";
import { userRouter } from "./routes/user";
import { webhookRouter } from "./routes/webhooks";
import {
  captureServerException,
  extractRequestContext,
} from "./utils/analytics";

export type { Bindings };

const corsOrigins = [process.env.CLIENT_ORIGIN];
export const app = new Hono<{ Bindings: Bindings }>()
  .basePath("/api")
  .use(
    cors({
      origin: (origin) => {
        if (!origin) return "";
        return corsOrigins.includes(origin) ? origin : "";
      },
      credentials: true,
    }),
  )
  .route("/webhooks", webhookRouter)
  .use("*", clerkAuth)
  // For global protection: .use("*", protect)
  // For per-route protection: .get("/api/private", protect, handler)
  .route("/categories", categoryRouter)
  .route("/analytics", analyticsRouter)
  .route("/subscriptions", subscriptionRouter)
  .route("/user", userRouter)
  .onError((err, ctx) => {
    console.error("[Unhandled Error]", err);
    if (ctx.env.POSTHOG_KEY) {
      void captureServerException(err, ctx.env.POSTHOG_KEY, {
        handled: false,
        requestContext: {
          ...extractRequestContext(ctx),
          responseStatus: 500,
        },
      });
    }
    return ctx.json({ error: "Internal Server Error" }, 500);
  });

export default app;
