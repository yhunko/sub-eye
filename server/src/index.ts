import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkAuth } from "./middleware/auth";
import { subscriptionRouter } from "./routes/subscriptions";

const corsOrigins = [process.env.CLIENT_ORIGIN ?? "http://localhost:5173"];

export const app = new Hono()
  .use(
    cors({
      origin: (origin) => {
        if (!origin) return "";
        return corsOrigins.includes(origin) ? origin : "";
      },
      credentials: true,
    }),
  )
  .use("*", clerkAuth)
  // For global protection: .use("*", protect)
  // For per-route protection: .get("/api/private", protect, handler)
  .route("/api/subscriptions", subscriptionRouter);

export default app;
