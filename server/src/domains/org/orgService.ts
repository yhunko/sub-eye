import { clerkClient } from "@clerk/express";
import type { PlanId } from "shared";
import { resolvePlanId } from "shared";

export class OrgService {
  static async getOrgPlanId(orgId: string): Promise<PlanId> {
    const org = await clerkClient.organizations.getOrganization({
      organizationId: orgId,
    });
    return resolvePlanId(
      (org.publicMetadata as Record<string, unknown>)?.planId,
    );
  }

  static async setOrgPlanId(orgId: string, planId: PlanId): Promise<void> {
    const org = await clerkClient.organizations.getOrganization({
      organizationId: orgId,
    });
    const currentMetadata = (org.publicMetadata ?? {}) as Record<
      string,
      unknown
    >;

    await clerkClient.organizations.updateOrganizationMetadata(orgId, {
      publicMetadata: { ...currentMetadata, planId },
    });
  }
}
