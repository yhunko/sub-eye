import type {
  ComparatorPlanInput,
  ComparatorQuotaDto,
  ComparatorRatesDto,
  ComparatorResultDto,
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
  PlanId,
  SubscriptionDto,
  UserPreferences,
} from "shared";
import {
  FREE_COMPARATOR_MONTHLY_LIMIT,
  isCurrentlyActiveSubscription,
} from "shared";
import { db } from "../../db";
import { CurrencyService } from "../currency/currencyService";
import { SubscriptionService } from "../subscription/subscriptionService";
import { UserService } from "../user/userService";
import { ComparatorCalculator } from "./comparatorCalculator";
import {
  ComparatorQuotaExceededError,
  ComparatorSubscriptionNotFoundError,
} from "./comparatorErrors";
import {
  getComparatorQuotaWindow,
  type QuotaWindow,
  toComparatorQuotaDto,
} from "./comparatorQuotaUtils";
import { ComparatorRepository } from "./comparatorRepository";

export type ComparatorServiceDeps = {
  repository: typeof ComparatorRepository;
  userService: typeof UserService;
  currencyService: typeof CurrencyService;
  subscriptionService: typeof SubscriptionService;
};

const defaultDeps: ComparatorServiceDeps = {
  repository: ComparatorRepository,
  userService: UserService,
  currencyService: CurrencyService,
  subscriptionService: SubscriptionService,
};

type ResolvedPlan = {
  source: ComparatorPlanInput["source"];
  subscriptionId: string | null;
  name: string;
  amount: number;
  currency: string;
  every: number;
  period: SubscriptionDto["period"];
};

type ComparisonContext = {
  planId: PlanId;
  preferences: UserPreferences;
  result: ComparatorResultDto;
};

const toQuota = (planId: PlanId, used: number, quotaWindow: QuotaWindow) =>
  toComparatorQuotaDto(planId, used, quotaWindow);

export class ComparatorService {
  static async getRates(
    userId: string,
    deps: ComparatorServiceDeps = defaultDeps,
  ): Promise<ComparatorRatesDto> {
    const preferences = await deps.userService.getUserPreferences(userId);
    const baseCurrencyCode = preferences.preferredCurrency;
    const rates = await deps.currencyService.getRates(baseCurrencyCode);

    return {
      baseCurrencyCode,
      rates,
    };
  }

  static async getQuota(
    userId: string,
    deps: ComparatorServiceDeps = defaultDeps,
  ): Promise<ComparatorQuotaDto> {
    const [planId, preferences] = await Promise.all([
      deps.userService.getPlanId(userId),
      deps.userService.getUserPreferences(userId),
    ]);

    const quotaWindow = getComparatorQuotaWindow(preferences.preferredTimezone);
    const usage = await deps.repository.findByUserAndPeriod(db, {
      userId,
      periodKey: quotaWindow.periodKey,
    });

    return toQuota(planId, usage?.comparisonsCount ?? 0, quotaWindow);
  }

  static async compare(
    userId: string,
    payload: CompareSubscriptionsInput,
    deps: ComparatorServiceDeps = defaultDeps,
  ): Promise<CompareSubscriptionsResponseDto> {
    const context = await ComparatorService.resolveComparisonContext(
      userId,
      payload,
      deps,
    );
    const quotaWindow = getComparatorQuotaWindow(
      context.preferences.preferredTimezone,
    );

    let used: number;

    if (context.planId === "free") {
      const consumed = await deps.repository.consumeMonthlyQuota(db, {
        userId,
        periodKey: quotaWindow.periodKey,
        limit: FREE_COMPARATOR_MONTHLY_LIMIT,
      });

      if (!consumed) {
        throw new ComparatorQuotaExceededError();
      }

      used = consumed.comparisonsCount;
    } else {
      const updated = await deps.repository.incrementMonthlyQuota(db, {
        userId,
        periodKey: quotaWindow.periodKey,
      });
      used = updated.comparisonsCount;
    }

    return {
      result: context.result,
      quota: toQuota(context.planId, used, quotaWindow),
    };
  }

  static async resolveComparisonContext(
    userId: string,
    payload: CompareSubscriptionsInput,
    deps: ComparatorServiceDeps,
  ): Promise<ComparisonContext> {
    const [planId, preferences, subscriptions] = await Promise.all([
      deps.userService.getPlanId(userId),
      deps.userService.getUserPreferences(userId),
      deps.subscriptionService.getSubscriptions(userId, { status: "all" }),
    ]);

    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    return {
      planId,
      preferences,
      result: ComparatorService.buildComparedResult({
        payload,
        subscriptions,
        preferredCurrencyCode: preferences.preferredCurrency,
        rates,
      }),
    };
  }

  private static buildComparedResult({
    payload,
    subscriptions,
    preferredCurrencyCode,
    rates,
  }: {
    payload: CompareSubscriptionsInput;
    subscriptions: SubscriptionDto[];
    preferredCurrencyCode: string;
    rates: Record<string, number>;
  }): ComparatorResultDto {
    const currentResolved = ComparatorService.resolvePlanInput(
      payload.currentPlan,
      subscriptions,
      "Current plan",
    );
    const candidateResolved = ComparatorService.resolvePlanInput(
      payload.candidatePlan,
      subscriptions,
      "Candidate plan",
    );

    const currentPlan = ComparatorCalculator.toMetrics(
      currentResolved,
      preferredCurrencyCode,
      rates,
    );
    const candidatePlan = ComparatorCalculator.toMetrics(
      candidateResolved,
      preferredCurrencyCode,
      rates,
    );
    const delta = ComparatorCalculator.toDelta(currentPlan, candidatePlan);

    const baselineMonthlyTotal = subscriptions
      .filter((subscription) =>
        isCurrentlyActiveSubscription(subscription.status),
      )
      .reduce(
        (sum, subscription) => sum + subscription.billing.preferred.monthly,
        0,
      );
    const portfolioContext = ComparatorCalculator.toPortfolioContext(
      baselineMonthlyTotal,
      delta,
    );

    return {
      preferredCurrencyCode,
      currentPlan,
      candidatePlan,
      delta,
      portfolioContext,
    };
  }

  private static resolvePlanInput(
    planInput: ComparatorPlanInput,
    subscriptions: SubscriptionDto[],
    fallbackName: string,
  ): ResolvedPlan {
    if (planInput.source === "manual") {
      return {
        source: "manual",
        subscriptionId: null,
        name: planInput.name?.trim() || fallbackName,
        amount: planInput.amount,
        currency: planInput.currency,
        every: planInput.every,
        period: planInput.period,
      };
    }

    const existing = subscriptions.find(
      (subscription) => subscription.id === planInput.subscriptionId,
    );

    if (!existing) {
      throw new ComparatorSubscriptionNotFoundError();
    }

    return {
      source: "existing",
      subscriptionId: existing.id,
      name: planInput.name?.trim() || existing.name,
      amount: existing.cost,
      currency: existing.currency,
      every: existing.every,
      period: existing.period,
    };
  }
}
