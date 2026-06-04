import { CategoryService } from "../category/categoryService";
import { SubscriptionHistoryRepository } from "../subscription/subscriptionHistoryRepository";
import { SubscriptionService } from "../subscription/subscriptionService";

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
    SubscriptionHistoryRepository.deleteByOrgId(orgId),
  ]);
}
