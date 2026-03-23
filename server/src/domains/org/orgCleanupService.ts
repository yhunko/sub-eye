import { db } from "../../db";
import { SubscriptionService } from "../subscription/subscriptionService";
import { CategoryService } from "../category/categoryService";
import { SubscriptionHistoryRepository } from "../subscription/subscriptionHistoryRepository";
import { OrgBillingAccountRepository } from "../billing/org/orgBillingAccountRepository";
import { BillingAccountRepository } from "../billing/paddle/billingAccountRepository";
import { UserService } from "../user/userService";

const PAID_PLUS_STATUSES = new Set(["trialing", "active", "past_due"]);

type OrgBillingInfo = {
  orgId: string;
  adminUserId: string | null;
};

/**
 * Handles cleanup when an organization is deleted.
 * Cancels all QStash workflows, deletes all org data from database.
 *
 * Note: SubscriptionService.deleteAllForOrg handles QStash workflow cancellation.
 */
export async function cleanupOrgData(orgId: string): Promise<void> {
  await Promise.all([
    SubscriptionService.deleteAllForOrg(orgId),
    CategoryService.deleteAllForOrg(orgId),
    SubscriptionHistoryRepository.deleteByOrgId(db, orgId),
    OrgBillingAccountRepository.deleteByOrgId(db, orgId),
  ]);
}

/**
 * Reverts admin's personal plan to free if they don't have an independent Plus subscription.
 */
export async function revertAdminPlanIfNeeded(
  adminUserId: string,
): Promise<void> {
  const adminBillingAccount = await BillingAccountRepository.findByUserId(
    db,
    adminUserId,
  );

  const hasIndependentPlus =
    adminBillingAccount?.paddleSubscriptionStatus &&
    PAID_PLUS_STATUSES.has(adminBillingAccount.paddleSubscriptionStatus);

  if (!hasIndependentPlus) {
    await UserService.setPlanId(adminUserId, "free");
  }
}

/**
 * Gets org billing info before cleanup (needed for plan revert).
 */
export async function getOrgBillingInfo(
  orgId: string,
): Promise<OrgBillingInfo> {
  const billingAccount = await OrgBillingAccountRepository.findByOrgId(
    db,
    orgId,
  );

  return {
    orgId,
    adminUserId: billingAccount?.adminUserId ?? null,
  };
}
