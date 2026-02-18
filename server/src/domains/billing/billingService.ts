import { db } from "../../db";
import { SubscriptionRepository } from "../subscription/subscriptionRepository";
import type { PlanUsage } from "@shared/domains/billing";
import { FREE_PLAN } from "@shared/domains/billing";

type BillingServiceDeps = {
  subscriptionRepository: typeof SubscriptionRepository;
};

const defaultDeps: BillingServiceDeps = {
  subscriptionRepository: SubscriptionRepository,
};

export class BillingService {
  /**
   * Aggregates usage statistics for a user across all domains.
   */
  static async getUsage(
    userId: string,
    deps: BillingServiceDeps = defaultDeps,
  ): Promise<PlanUsage> {
    const subscriptionsCount = await deps.subscriptionRepository.countByUserId(
      db,
      userId,
    );

    return {
      subscriptions: {
        current: subscriptionsCount,
        limit: FREE_PLAN.limits.maxSubscriptions,
      },
      // Future usage metrics can be added here (e.g., push notifications, analytics)
    };
  }
}
