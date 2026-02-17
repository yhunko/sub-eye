import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkAuth } from "./middleware/auth";
import { analyticsRouter } from "./routes/analytics";
import { subscriptionRouter } from "./routes/subscriptions";
import { pushNotificationRouter } from "./routes/push-notifications";
import { userRouter } from "./routes/user";

import { webhookRouter } from "./routes/webhooks";

type Bindings = {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  DATABASE_URL: string;
  QSTASH_URL: string;
  QSTASH_TOKEN: string;
  QSTASH_CURRENT_SIGNING_KEY: string;
  QSTASH_NEXT_SIGNING_KEY: string;
};

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
  .route("/analytics", analyticsRouter)
  .route("/subscriptions", subscriptionRouter)
  .route("/push-notifications", pushNotificationRouter)
  .route("/user", userRouter);

export default app;
