import type { PlanUsage } from "shared";
import { getPlanById, getPlanFeaturesMap } from "shared";
import { db } from "../../db";
import { CategoryRepository } from "../category/categoryRepository";
import {
  getComparatorQuotaWindow,
  toComparatorAiQuotaDto,
  toComparatorQuotaDto,
} from "../comparator/comparatorQuotaUtils";
import { ComparatorRepository } from "../comparator/comparatorRepository";
import { OrgService } from "../org/orgService";
import { SubscriptionRepository } from "../subscription/subscriptionRepository";
import { UserService } from "../user/userService";

type BillingServiceDeps = {
  subscriptionRepository: typeof SubscriptionRepository;
  categoryRepository: typeof CategoryRepository;
  comparatorRepository: typeof ComparatorRepository;
  userService: typeof UserService;
  orgService: typeof OrgService;
};

const defaultDeps: BillingServiceDeps = {
  subscriptionRepository: SubscriptionRepository,
  categoryRepository: CategoryRepository,
  comparatorRepository: ComparatorRepository,
  userService: UserService,
  orgService: OrgService,
};

export class BillingService {
  /**
   * Aggregates usage statistics for a user or org space.
   * When orgId is provided, returns usage for the org space.
   * AI/comparator quotas are always personal (per-user).
   */
  static async getUsage(
    userId: string,
    orgId?: string | null,
    deps: BillingServiceDeps = defaultDeps,
  ): Promise<PlanUsage> {
    const [preferences] = await Promise.all([
      deps.userService.getUserPreferences(userId),
    ]);

    const quotaWindow = getComparatorQuotaWindow(preferences.preferredTimezone);

    if (orgId) {
      const [
        subscriptionsCount,
        categoriesCount,
        planId,
        comparisonUsage,
        aiUsage,
      ] = await Promise.all([
        deps.subscriptionRepository.countByOrgId(db, orgId),
        deps.categoryRepository.countByOrgId(db, orgId),
        deps.orgService.getOrgPlanId(orgId),
        deps.comparatorRepository.findByUserAndPeriod(db, {
          userId,
          periodKey: quotaWindow.periodKey,
        }),
        deps.comparatorRepository.findAiUsageByUserAndPeriod(db, {
          userId,
          periodKey: quotaWindow.periodKey,
        }),
      ]);

      const plan = getPlanById(planId);
      const comparatorComparisons = toComparatorQuotaDto(
        planId,
        comparisonUsage?.comparisonsCount ?? 0,
        quotaWindow,
      );
      const aiInsights = toComparatorAiQuotaDto(
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
        categories: {
          current: categoriesCount,
          limit: plan.limits.maxCategories,
        },
        comparatorComparisons: {
          current: comparatorComparisons.used,
          limit: comparatorComparisons.limit,
          remaining: comparatorComparisons.remaining,
          periodKey: comparatorComparisons.periodKey,
          resetsAt: comparatorComparisons.resetsAt,
          isLimited: comparatorComparisons.isLimited,
        },
        aiInsights: {
          current: aiInsights.used,
          limit: aiInsights.limit,
          remaining: aiInsights.remaining,
          periodKey: aiInsights.periodKey,
          resetsAt: aiInsights.resetsAt,
          isLimited: aiInsights.isLimited,
        },
      };
    }

    const [
      subscriptionsCount,
      categoriesCount,
      planId,
      comparisonUsage,
      aiUsage,
    ] = await Promise.all([
      deps.subscriptionRepository.countByUserId(db, userId),
      deps.categoryRepository.countByUserId(db, userId),
      deps.userService.getPlanId(userId),
      deps.comparatorRepository.findByUserAndPeriod(db, {
        userId,
        periodKey: quotaWindow.periodKey,
      }),
      deps.comparatorRepository.findAiUsageByUserAndPeriod(db, {
        userId,
        periodKey: quotaWindow.periodKey,
      }),
    ]);

    const plan = getPlanById(planId);
    const comparatorComparisons = toComparatorQuotaDto(
      planId,
      comparisonUsage?.comparisonsCount ?? 0,
      quotaWindow,
    );
    const aiInsights = toComparatorAiQuotaDto(
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
      categories: {
        current: categoriesCount,
        limit: plan.limits.maxCategories,
      },
      comparatorComparisons: {
        current: comparatorComparisons.used,
        limit: comparatorComparisons.limit,
        remaining: comparatorComparisons.remaining,
        periodKey: comparatorComparisons.periodKey,
        resetsAt: comparatorComparisons.resetsAt,
        isLimited: comparatorComparisons.isLimited,
      },
      aiInsights: {
        current: aiInsights.used,
        limit: aiInsights.limit,
        remaining: aiInsights.remaining,
        periodKey: aiInsights.periodKey,
        resetsAt: aiInsights.resetsAt,
        isLimited: aiInsights.isLimited,
      },
    };
  }
}
