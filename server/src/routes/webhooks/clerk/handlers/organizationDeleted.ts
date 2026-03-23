import type { Context } from "hono";
import {
  cleanupOrgData,
  getOrgBillingInfo,
  revertAdminPlanIfNeeded,
} from "../../../../domains/org/orgCleanupService";
import type { ClerkWebhookEnv } from "../types";

export const handleOrganizationDeleted = async (
  c: Context<ClerkWebhookEnv>,
) => {
  const { data } = c.var.webhookEvent;
  const orgId = data.id;
  console.log(`[Clerk Webhook] Organization deleted: ${orgId}`);

  // Get billing info before cleanup (needed for plan revert)
  const billingInfo = await getOrgBillingInfo(orgId);

  // Cleanup all org data
  await cleanupOrgData(orgId);

  // Revert admin's personal plan if they don't have independent Plus
  if (billingInfo.adminUserId) {
    await revertAdminPlanIfNeeded(billingInfo.adminUserId);
  }

  return c.text("Webhook received", 200);
};
