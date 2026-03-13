import { Hono } from "hono";
import { clerkAuth } from "./middleware/auth";
import { analyticsRouter } from "./routes/analytics";
import { subscriptionRouter } from "./routes/subscriptions";
import { comparatorRouter } from "./routes/comparator";
import { pushNotificationRouter } from "./routes/push-notifications";
import { userRouter } from "./routes/user";
import { telegramNotificationRouter } from "./routes/telegram-notifications";

import { webhookRouter } from "./routes/webhooks";
import { billingRouter } from "./routes/billing";

type Bindings = {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  PADDLE_WEBHOOK_SECRET: string;
  PADDLE_API_KEY: string;
  PADDLE_PLUS_PRODUCT_ID: string;
  PADDLE_ENV: "sandbox" | "live";
  GEMINI_API_KEY: string;
  DATABASE_URL: string;
  QSTASH_URL: string;
  QSTASH_TOKEN: string;
  QSTASH_CURRENT_SIGNING_KEY: string;
  QSTASH_NEXT_SIGNING_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_WEBHOOK_SECRET_TOKEN: string;
  CLIENT_ORIGIN: string;
};

export const app = new Hono<{ Bindings: Bindings }>()
  .basePath("/api")
  .use(async (ctx, next) => {
    const origin = ctx.req.header("Origin") ?? "";
    const allowed = ctx.env.CLIENT_ORIGIN;
    if (origin && origin === allowed) {
      ctx.header("Access-Control-Allow-Origin", origin);
      ctx.header("Access-Control-Allow-Credentials", "true");
      ctx.header("Vary", "Origin");
    }
    if (ctx.req.method === "OPTIONS") {
      ctx.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      );
      ctx.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
      return new Response("", { status: 204 });
    }
    return next();
  })
  .route("/webhooks", webhookRouter)
  .use("*", clerkAuth)
  // For global protection: .use("*", protect)
  // For per-route protection: .get("/api/private", protect, handler)
  .route("/analytics", analyticsRouter)
  .route("/comparator", comparatorRouter)
  .route("/billing", billingRouter)
  .route("/subscriptions", subscriptionRouter)
  .route("/push-notifications", pushNotificationRouter)
  .route("/telegram-notifications", telegramNotificationRouter)
  .route("/user", userRouter);

export default app;
