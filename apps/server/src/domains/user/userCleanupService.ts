import { CategoryService } from "../category/categoryService";
import { PushNotificationService } from "../push-notification/pushNotificationService";
import { SubscriptionHistoryRepository } from "../subscription/subscriptionHistoryRepository";
import { SubscriptionService } from "../subscription/subscriptionService";

export type CleanupDomain =
  | "subscriptions"
  | "categories"
  | "push_notifications"
  | "subscription_history";

export type CleanupResult = {
  domain: CleanupDomain;
  ok: boolean;
  error?: string;
};

export type UserCleanupResult = {
  userId: string;
  results: CleanupResult[];
  errors: Array<{ domain: CleanupDomain; error: string }>;
};

/**
 * Cleans up all user-owned data across all domains.
 * Uses Promise.allSettled so one failure doesn't block others.
 */
export async function cleanupUserData(
  userId: string,
): Promise<UserCleanupResult> {
  const settledResults = await Promise.allSettled([
    SubscriptionService.deleteAllForUser(userId),
    CategoryService.deleteAllForUser(userId),
    PushNotificationService.deleteAllForUser(userId),
    SubscriptionHistoryRepository.deleteByUserId(userId),
  ]);

  const domains: CleanupDomain[] = [
    "subscriptions",
    "categories",
    "push_notifications",
    "subscription_history",
  ];

  const results: CleanupResult[] = settledResults.map((result, index) => {
    const domain = domains[index]!;
    if (result.status === "fulfilled") {
      return { domain, ok: true };
    }
    return {
      domain,
      ok: false,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    };
  });

  const errors = results
    .filter((r) => !r.ok)
    .map((r) => ({ domain: r.domain, error: r.error! }));

  return { userId, results, errors };
}
