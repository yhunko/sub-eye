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

    // Aggregate subscription stats
    let monthlyBurnRate = 0;
    let activeSubscriptionsAuto = 0;
    let activeSubscriptionsManual = 0;

    for (const sub of currentlyActiveSubscriptions) {
      monthlyBurnRate += sub.billing.preferred.monthly;
      if (sub.autoPaid) {
        activeSubscriptionsAuto += 1;
      } else {
        activeSubscriptionsManual += 1;
      }
    }

    // Delegate all projections to calculator
    const mostExpensiveSubscription = AnalyticsCalculator.findMostExpensive(
      currentlyActiveSubscriptions,
    );

    const allUpcomingPayments = AnalyticsCalculator.projectUpcomingPayments(
      currentlyActiveSubscriptions,
      today,
      oneYearFromNow,
      preferredCurrencyCode,
      timezone,
    );

    const upcomingRenewals = [...allUpcomingPayments]
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    const {
      forecast: cashFlowForecast,
      remainingThisMonth,
      totalUpcomingMonth,
    } = AnalyticsCalculator.buildCashFlowForecast(
      currentlyActiveSubscriptions,
      today,
      timezone,
    );

    const monthlyTrendStartOffset = -1;
    const monthlyTrend = AnalyticsCalculator.buildMonthlyTrend(
      currentlyActiveSubscriptions,
      DateTimezoneUtils.shiftMonths(today, monthlyTrendStartOffset, timezone),
      12,
      timezone,
    );
    const currentMonthIndex = Math.abs(monthlyTrendStartOffset);
    const nextMonthForecast = monthlyTrend[currentMonthIndex + 1]?.amount ?? 0;

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

    // A pause you forgot about is a charge you did not plan for. Only pauses
    // with a known resume date can be surfaced — an indefinite pause has no
    // date to warn about.
    const resumingSoon = subscriptions
      .filter(
        (subscription) =>
          subscription.status === "paused" && subscription.resumeAt,
      )
      .sort(
        (a, b) =>
          Date.parse(a.resumeAt as string) - Date.parse(b.resumeAt as string),
      )
      .map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        brandDomain: subscription.brandDomain,
        resumeAt: subscription.resumeAt as string,
        amount: subscription.billing.preferred.amount,
        currencyCode: subscription.billing.preferred.currencyCode,
      }));

    return {
      preferredCurrencyCode,
      monthlyBurnRate,
      yearlyForecast,
      remainingThisMonth,
      nextMonthForecast,
      activeSubscriptionsTotal: currentlyActiveSubscriptions.length,
      activeSubscriptionsAuto,
      activeSubscriptionsManual,
      mostExpensiveSubscription,
      cashFlowForecast,
      upcomingRenewals,
      totalUpcomingMonth,
      monthlyTrend,
      categorySpending,
      timezone,
      resumingSoon,
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
