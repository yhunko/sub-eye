import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkAuth } from "./middleware/auth";
import { subscriptionRouter } from "./routes/subscriptions";
import { userRouter } from "./routes/user";

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
  .route("/api/subscriptions", subscriptionRouter)
  .route("/api/user", userRouter);

export default app;
