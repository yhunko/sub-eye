import { Hono } from "hono";
import { clerkWebhookRouter } from "./clerk";

/**
 * Aggregates all webhook sub-routers.
 *
 * Each external service gets its own sub-router mounted under
 * `/webhooks/<service>`. Clerk endpoints sit at `/webhooks/clerk/*`.
 *
 * **Adding a new service:**
 * 1. Create a directory `./serviceName/` with its own router
 * 2. Mount it here with `.route("/serviceName", serviceRouter)`
 */
export const webhookRouter = new Hono();

webhookRouter.route("/clerk", clerkWebhookRouter);
