import { db } from "../../db";
import { SubscriptionRepository } from "../subscription/subscriptionRepository";
import type { PlanUsage } from "shared";
import { getPlanById, getPlanFeaturesMap } from "shared";
import { UserService } from "../user/userService";

type BillingServiceDeps = {
  subscriptionRepository: typeof SubscriptionRepository;
  userService: typeof UserService;
};

const defaultDeps: BillingServiceDeps = {
  subscriptionRepository: SubscriptionRepository,
  userService: UserService,
};

export class BillingService {
  /**
   * Aggregates usage statistics for a user across all domains.
   */
  static async getUsage(
    userId: string,
    deps: BillingServiceDeps = defaultDeps,
  ): Promise<PlanUsage> {
    const [subscriptionsCount, planId] = await Promise.all([
      deps.subscriptionRepository.countByUserId(db, userId),
      deps.userService.getPlanId(userId),
    ]);
    const plan = getPlanById(planId);

    return {
      planId,
      features: getPlanFeaturesMap(planId),
      subscriptions: {
        current: subscriptionsCount,
        limit: plan.limits.maxSubscriptions,
      },
    };
  }
}
