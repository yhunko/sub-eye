import { db } from "../../db";
import { SubscriptionRepository } from "../subscription/subscriptionRepository";
import type { PlanUsage } from "shared";
import { getPlanById, getPlanFeaturesMap } from "shared";
import { UserService } from "../user/userService";
import { ComparatorRepository } from "../comparator/comparatorRepository";
import {
  getComparatorQuotaWindow,
  toComparatorAiQuotaDto,
  toComparatorQuotaDto,
} from "../comparator/comparatorQuotaUtils";

type BillingServiceDeps = {
  subscriptionRepository: typeof SubscriptionRepository;
  comparatorRepository: typeof ComparatorRepository;
  userService: typeof UserService;
};

const defaultDeps: BillingServiceDeps = {
  subscriptionRepository: SubscriptionRepository,
  comparatorRepository: ComparatorRepository,
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
    const [subscriptionsCount, planId, preferences] = await Promise.all([
      deps.subscriptionRepository.countByUserId(db, userId),
      deps.userService.getPlanId(userId),
      deps.userService.getUserPreferences(userId),
    ]);
    const plan = getPlanById(planId);
    const quotaWindow = getComparatorQuotaWindow(preferences.preferredTimezone);
    const [comparisonUsage, aiUsage] = await Promise.all([
      deps.comparatorRepository.findByUserAndPeriod(db, {
        userId,
        periodKey: quotaWindow.periodKey,
      }),
      deps.comparatorRepository.findAiUsageByUserAndPeriod(db, {
        userId,
        periodKey: quotaWindow.periodKey,
      }),
    ]);
    const comparatorComparisons = toComparatorQuotaDto(
      planId,
      comparisonUsage?.comparisonsCount ?? 0,
      quotaWindow,
    );
    const comparatorAiInsights = toComparatorAiQuotaDto(
      planId,
      aiUsage?.analysesCount ?? 0,
      quotaWindow,
    );

    return {
      planId,
      features: getPlanFeaturesMap(planId),
      subscriptions: {
        current: subscriptionsCount,
        limit: plan.limits.maxSubscriptions,
      },
      comparatorComparisons: {
        current: comparatorComparisons.used,
        limit: comparatorComparisons.limit,
        remaining: comparatorComparisons.remaining,
        periodKey: comparatorComparisons.periodKey,
        resetsAt: comparatorComparisons.resetsAt,
        isLimited: comparatorComparisons.isLimited,
      },
      comparatorAiInsights: {
        current: comparatorAiInsights.used,
        limit: comparatorAiInsights.limit,
        remaining: comparatorAiInsights.remaining,
        periodKey: comparatorAiInsights.periodKey,
        resetsAt: comparatorAiInsights.resetsAt,
        isLimited: comparatorAiInsights.isLimited,
      },
    };
  }
}
