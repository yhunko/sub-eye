import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiResponse } from "shared/dist";
import { clerkAuth, protect } from "./middleware/auth";

export const app = new Hono()

  .use(cors())
  .use("*", clerkAuth)
  .use("/api/*", protect)
  // For global protection: .use("*", protect)
  // For per-route protection: .get("/api/private", protect, handler)

  .get("/", (c) => {
    return c.text("Hello Hono!");
  })

  .get("/hello", async (c) => {
    const data: ApiResponse = {
      message: "Hello BHVR!",
      success: true,
    };

    return c.json(data, { status: 200 });
  });

export default app;
