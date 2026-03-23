import { Hono } from "hono";
import { svixVerification } from "../../../middleware/svixVerification";
import { handleUserDeleted } from "./handlers/userDeleted";
import { handleOrganizationDeleted } from "./handlers/organizationDeleted";
import { handleOrganizationMembershipDeleted } from "./handlers/organizationMembershipDeleted";
import type { ClerkWebhookEnv } from "./types";

/**
 * Clerk webhook router.
 *
 * Each Clerk event type is mounted at its own path (e.g. `/user/deleted`)
 * so you can scope individual endpoints in the Clerk Dashboard.
 *
 * All routes share the {@link svixVerification} middleware for
 * signature validation.
 *
 * **Adding a new event handler:**
 * 1. Create a handler in `./handlers/<eventName>.ts`
 * 2. Add the event type to `ClerkEventType` in `./types.ts`
 * 3. Mount it below with `.post("/path", verify, handler)`
 */
const verify = svixVerification("CLERK_WEBHOOK_SECRET");

export const clerkWebhookRouter = new Hono<ClerkWebhookEnv>()
  .post("/user/deleted", verify, handleUserDeleted)
  .post("/organization/deleted", verify, handleOrganizationDeleted)
  .post(
    "/organization/membership/deleted",
    verify,
    handleOrganizationMembershipDeleted,
  );
