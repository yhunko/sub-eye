import { Hono } from "hono";
import { cors } from "hono/cors";
import { CurrencyService } from "./domains/currency/currencyService";
import type { Bindings } from "./env";
import { clerkAuth } from "./middleware/auth";
import { analyticsRouter } from "./routes/analytics";
import { categoryRouter } from "./routes/categories";
import { subscriptionRouter } from "./routes/subscriptions";
import { userRouter } from "./routes/user";
import { webhookRouter } from "./routes/webhooks";
import { reportServerException } from "./utils/analytics";
import { apiErrorBody } from "./utils/routeUtils";

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
    reportServerException(ctx, err, { handled: false, responseStatus: 500 });
    return ctx.json(
      apiErrorBody("INTERNAL_ERROR", "Internal Server Error"),
      500,
    );
  });

export default {
  fetch: app.fetch,
  /**
   * Daily FX refresh. Keeping this on a cron is what allows GET /subscriptions
   * and the analytics endpoints to read rates from Postgres instead of waiting
   * on an outbound CDN fetch.
   */
  scheduled: async (
    _event: { cron: string },
    _env: Bindings,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ) => {
    ctx.waitUntil(
      CurrencyService.refreshRates()
        .then((result) =>
          console.log(
            `[cron] fx refreshed: ${result.codes} codes for ${result.rateDate}`,
          ),
        )
        .catch((error) => console.error("[cron] fx refresh failed", error)),
    );
  },
};
