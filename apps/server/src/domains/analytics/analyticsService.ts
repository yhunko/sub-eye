import type {
  DashboardAnalyticsDto,
  MonthlySpendSummaryDto,
  MonthlySpendTrendPoint,
  WeeklyRenewalsSummaryDto,
} from "@subeye/shared";
import {
  CurrencyUtils,
  DateTimezoneUtils,
  isCurrentlyActiveSubscription,
} from "@subeye/shared";
import { AnalyticsCalculator } from "@subeye/spend";
import { eachDayOfInterval, endOfWeek, startOfWeek } from "date-fns";
import { CategoryService } from "../category/categoryService";
import { SubscriptionService } from "../subscription/subscriptionService";
import { UserService } from "../user/userService";

type AnalyticsServiceDeps = {
  subscriptionService: typeof SubscriptionService;
  userService: typeof UserService;
  categoryService: typeof CategoryService;
};

const defaultDeps: AnalyticsServiceDeps = {
  subscriptionService: SubscriptionService,
  userService: UserService,
  categoryService: CategoryService,
};

/**
 * Orchestrates analytics data retrieval.
 * Fetches data via dependencies, then delegates all calculations to AnalyticsCalculator.
 */
export class AnalyticsService {
  static async getDashboardStats(
    userId: string,
    deps: AnalyticsServiceDeps = defaultDeps,
  ): Promise<DashboardAnalyticsDto> {
    const [
      { subscriptions, preferredCurrencyCode, now, timezone },
      categories,
    ] = await Promise.all([
      AnalyticsService.getAnalyticsContext(userId, deps),
      deps.categoryService.getCategories(userId),
    ]);

    const today = DateTimezoneUtils.startOfDay(now, timezone);
    const oneYearFromNow = DateTimezoneUtils.shiftMonths(today, 12, timezone);
    const analyticsEligibleSubscriptions = subscriptions.filter(
      (subscription) =>
        AnalyticsCalculator.hasUpcomingOccurrence(
          subscription,
          today,
          timezone,
        ),
    );
    const currentlyActiveSubscriptions = analyticsEligibleSubscriptions.filter(
      (subscription) => isCurrentlyActiveSubscription(subscription.status),
    );

    const monthlyBurnRate = currentlyActiveSubscriptions.reduce(
      (total, sub) => total + sub.billing.preferred.monthly,
      0,
    );

    // Delegate all projections to calculator
    const mostExpensiveSubscription = AnalyticsCalculator.findMostExpensive(
      currentlyActiveSubscriptions,
    );

    const upcomingRenewals = AnalyticsCalculator.nextOccurrenceRenewals(
      currentlyActiveSubscriptions,
      today,
      preferredCurrencyCode,
      timezone,
    ).slice(0, 5);

    const {
      forecast: cashFlowForecast,
      remainingThisMonth,
      totalUpcomingMonth,
    } = AnalyticsCalculator.buildCashFlowForecast(
      currentlyActiveSubscriptions,
      today,
      timezone,
    );

    const nextMonthForecast =
      AnalyticsCalculator.buildMonthlyTrend(
        currentlyActiveSubscriptions,
        DateTimezoneUtils.shiftMonths(today, 1, timezone),
        1,
        timezone,
      )[0]?.amount ?? 0;

    const categorySpending = AnalyticsCalculator.buildCategorySpending(
      currentlyActiveSubscriptions,
      categories,
    );

    // yearlyForecast counts the occurrences that actually land in the next 12
    // months — NOT monthlyBurnRate * 12. A cancelling subscription that lapses
    // mid-year, or (once pause lands) a paused one, keeps a full monthly
    // run-rate but contributes fewer charges to the year.
    const yearlyForecast = Number(
      AnalyticsCalculator.sumSpendInRange(
        currentlyActiveSubscriptions,
        today,
        oneYearFromNow,
        timezone,
      ).toFixed(2),
    );

    return {
      preferredCurrencyCode,
      monthlyBurnRate,
      yearlyForecast,
      remainingThisMonth,
      nextMonthForecast,
      activeSubscriptionsTotal: currentlyActiveSubscriptions.length,
      mostExpensiveSubscription,
      cashFlowForecast,
      upcomingRenewals,
      totalUpcomingMonth,
      categorySpending,
      timezone,
    };
  }

  static async getMonthlySpendSummary(
    userId: string,
    deps: AnalyticsServiceDeps = defaultDeps,
  ): Promise<MonthlySpendSummaryDto> {
    const { subscriptions, timezone, preferredCurrencyCode, now } =
      await AnalyticsService.getAnalyticsContext(userId, deps);

    const monthOffsets = [-1, 0, 1, 2, 3, 4, 5, 6];

    const trend: MonthlySpendTrendPoint[] = monthOffsets.map((offset) => {
      const monthRef = DateTimezoneUtils.shiftMonths(now, offset, timezone);
      const monthStart = DateTimezoneUtils.startOfMonth(monthRef, timezone);
      const monthEnd = DateTimezoneUtils.endOfMonth(monthRef, timezone);
      const total = AnalyticsCalculator.sumSpendInRange(
        subscriptions,
        monthStart,
        monthEnd,
        timezone,
      );
      return {
        date: monthStart.toISOString(),
        amount: Number(total.toFixed(2)),
      };
    });

    const currentMonthTotal =
      trend.find((_, index) => monthOffsets[index] === 0)?.amount ?? 0;
    const previousMonthTotal =
      trend.find((_, index) => monthOffsets[index] === -1)?.amount ?? 0;
    const deltaPercentage =
      previousMonthTotal > 0
        ? Number(
            (
              ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) *
              100
            ).toFixed(1),
          )
        : null;

    return {
      currencyCode: preferredCurrencyCode,
      currentMonthTotal,
      previousMonthTotal,
      deltaPercentage,
      trend,
    };
  }

  static async getWeeklyRenewalsSummary(
    userId: string,
    deps: AnalyticsServiceDeps = defaultDeps,
  ): Promise<WeeklyRenewalsSummaryDto> {
    const { subscriptions, timezone, preferredCurrencyCode, now } =
      await AnalyticsService.getAnalyticsContext(userId, deps);

    const nowZoned = DateTimezoneUtils.toZoned(now, timezone);
    const startOfCurrentWeek = DateTimezoneUtils.startOfDay(
      startOfWeek(nowZoned, { weekStartsOn: 1 }),
      timezone,
    );
    const endOfCurrentWeek = DateTimezoneUtils.endOfDay(
      endOfWeek(nowZoned, { weekStartsOn: 1 }),
      timezone,
    );

    const totalThisWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      startOfCurrentWeek,
      endOfCurrentWeek,
      timezone,
    );

    const totalUpcomingWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      DateTimezoneUtils.startOfDay(now, timezone),
      endOfCurrentWeek,
      timezone,
    );

    const daysInWeek = eachDayOfInterval({
      start: startOfCurrentWeek,
      end: endOfCurrentWeek,
    });

    const trend = daysInWeek.map((day) => {
      const dayStart = DateTimezoneUtils.startOfDay(day, timezone);
      const dailyTotal = AnalyticsCalculator.sumSpendInRange(
        subscriptions,
        dayStart,
        DateTimezoneUtils.endOfDay(dayStart, timezone),
        timezone,
      );
      return {
        date: dayStart.toISOString(),
        amount: Number(dailyTotal.toFixed(2)),
      };
    });

    return {
      currencyCode: preferredCurrencyCode,
      totalThisWeek: Number(totalThisWeek.toFixed(2)),
      totalUpcomingWeek: Number(totalUpcomingWeek.toFixed(2)),
      trend,
    };
  }

  private static async getAnalyticsContext(
    userId: string,
    deps: AnalyticsServiceDeps,
  ) {
    const subscriptions =
      await deps.subscriptionService.getSubscriptions(userId);
    const metadata = await deps.userService.getUserPreferences(userId);

    const normalizedCurrency = CurrencyUtils.normalizeCode(
      metadata.preferredCurrency,
    );
    const preferredCurrencyCode =
      subscriptions[0]?.billing.preferred.currencyCode ?? normalizedCurrency;
    const now = DateTimezoneUtils.now(metadata.preferredTimezone);

    return {
      subscriptions,
      metadata,
      preferredCurrencyCode,
      timezone: metadata.preferredTimezone,
      now,
    };
  }
}
