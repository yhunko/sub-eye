import { db } from "../../db";
import { SubscriptionService } from "../subscription/subscriptionService";
import { CategoryService } from "../category/categoryService";
import { PushNotificationService } from "../push-notification/pushNotificationService";
import { TelegramNotificationService } from "../telegram-notification/telegramNotificationService";
import { BillingAccountRepository } from "../billing/paddle/billingAccountRepository";
import { ComparatorRepository } from "../comparator/comparatorRepository";
import { SubscriptionHistoryRepository } from "../subscription/subscriptionHistoryRepository";

export type CleanupDomain =
  | "subscriptions"
  | "categories"
  | "push_notifications"
  | "telegram_notifications"
  | "billing_accounts"
  | "comparator"
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
    TelegramNotificationService.deleteAllForUser(userId),
    BillingAccountRepository.deleteByUserId(db, userId),
    ComparatorRepository.deleteAllForUser(db, userId),
    SubscriptionHistoryRepository.deleteByUserId(db, userId),
  ]);

  const domains: CleanupDomain[] = [
    "subscriptions",
    "categories",
    "push_notifications",
    "telegram_notifications",
    "billing_accounts",
    "comparator",
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
