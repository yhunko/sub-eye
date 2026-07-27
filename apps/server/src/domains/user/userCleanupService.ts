import { CategoryService } from "../category/categoryService";
import { SubscriptionService } from "../subscription/subscriptionService";
import { UserRepository } from "./userRepository";

export type CleanupDomain = "subscriptions" | "categories" | "users";

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
    UserRepository.deleteById(userId),
  ]);

  const domains: CleanupDomain[] = ["subscriptions", "categories", "users"];

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
