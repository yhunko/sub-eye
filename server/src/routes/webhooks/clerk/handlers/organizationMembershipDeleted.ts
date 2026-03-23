import type { Context } from "hono";
import { clerkClient } from "@clerk/express";
import {
  cleanupOrgData,
  getOrgBillingInfo,
  revertAdminPlanIfNeeded,
} from "../../../../domains/org/orgCleanupService";
import type { ClerkWebhookEnv } from "../types";

type OrganizationMembershipDeletedData = {
  id: string;
  organization: {
    id: string;
    name: string;
    slug?: string;
  };
  public_user_data: {
    user_id: string;
    organization: {
      roles: string[];
    };
  };
};

export const handleOrganizationMembershipDeleted = async (
  c: Context<ClerkWebhookEnv>,
) => {
  const { data } = c.var.webhookEvent;
  const membershipData = data as unknown as OrganizationMembershipDeletedData;
  const orgId = membershipData.organization.id;
  const userId = membershipData.public_user_data.user_id;

  console.log(
    `[Clerk Webhook] Organization membership deleted: org=${orgId}, user=${userId}`,
  );

  try {
    // Get remaining member count from Clerk
    const { totalCount } =
      await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      });

    if (totalCount === 0) {
      // Last member leaving - cleanup and delete org
      console.log(
        `[Clerk Webhook] Last member left org ${orgId}, cleaning up and deleting org`,
      );

      // Get billing info before cleanup
      const billingInfo = await getOrgBillingInfo(orgId);

      // Cleanup all org data
      await cleanupOrgData(orgId);

      // Revert admin's personal plan if needed
      if (billingInfo.adminUserId) {
        await revertAdminPlanIfNeeded(billingInfo.adminUserId);
      }

      // Delete the org via Clerk API
      await clerkClient.organizations.deleteOrganization(orgId);
      console.log(`[Clerk Webhook] Organization ${orgId} deleted`);
    } else {
      // Not the last member - check if the leaving user was the billing admin
      const billingInfo = await getOrgBillingInfo(orgId);

      if (billingInfo.adminUserId === userId) {
        console.warn(
          `[Clerk Webhook] WARNING: Billing admin ${userId} left org ${orgId} with ${totalCount} remaining members. ` +
            `Consider transferring billing responsibility or notify the org.`,
        );
      }
    }
  } catch (error) {
    // If org doesn't exist anymore (race condition), log and continue
    if (
      error instanceof Error &&
      (error.message.includes("not found") || error.message.includes("404"))
    ) {
      console.log(
        `[Clerk Webhook] Organization ${orgId} not found (may have been already deleted)`,
      );
    } else {
      throw error;
    }
  }

  return c.text("Webhook received", 200);
};
