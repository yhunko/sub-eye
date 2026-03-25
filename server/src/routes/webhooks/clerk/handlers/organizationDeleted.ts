import type { Context } from "hono";
import { cleanupOrgData } from "../../../../domains/org/orgCleanupService";
import type { ClerkWebhookEnv } from "../types";

export const handleOrganizationDeleted = async (
  c: Context<ClerkWebhookEnv>,
) => {
  const { data } = c.var.webhookEvent;
  const orgId = data.id;
  console.log(`[Clerk Webhook] Organization deleted: ${orgId}`);

  // Cleanup all org data
  await cleanupOrgData(orgId);

  return c.text("Webhook received", 200);
};
