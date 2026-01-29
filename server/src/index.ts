import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkAuth, protect } from "./middleware/auth";

export const app = new Hono()

  .use(cors())
  .use("*", clerkAuth)
  .use("/api/*", protect)
  // For global protection: .use("*", protect)
  // For per-route protection: .get("/api/private", protect, handler)

  .get("/", (c) => {
    return c.text("Hello Hono!");
  });

export default app;
