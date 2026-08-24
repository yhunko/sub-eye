import { isCurrentlyActiveSubscription } from "@subeye/lifecycle";
import type {
  DashboardAnalyticsDto,
  MonthlySpendSummaryDto,
  MonthlySpendTrendPoint,
  WeeklyRenewalsSummaryDto,
} from "@subeye/model";
import { CurrencyUtils } from "@subeye/money";
import { AnalyticsCalculator } from "@subeye/spend";
import { DateTimezoneUtils } from "@subeye/time";
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

    // The user's current calendar day, as the UTC midnight every stored date is
    // expressed in — not `startOfDay(now, timezone)`, which is that day's start
    // as an INSTANT and therefore a different value from the days it is compared
    // against everywhere below.
    const today = DateTimezoneUtils.currentCalendarDay(now, timezone);
    const oneYearFromNow = DateTimezoneUtils.shiftCalendarMonths(today, 12);
    const analyticsEligibleSubscriptions = subscriptions.filter(
      (subscription) =>
        AnalyticsCalculator.hasUpcomingOccurrence(subscription, today),
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
        DateTimezoneUtils.shiftCalendarMonths(today, 1),
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

    const today = DateTimezoneUtils.currentCalendarDay(now, timezone);

    const trend: MonthlySpendTrendPoint[] = monthOffsets.map((offset) => {
      const monthRef = DateTimezoneUtils.shiftCalendarMonths(today, offset);
      const monthStart = DateTimezoneUtils.startOfCalendarMonth(monthRef);
      const monthEnd = DateTimezoneUtils.endOfCalendarMonth(monthRef);
      const total = AnalyticsCalculator.sumSpendInRange(
        subscriptions,
        monthStart,
        monthEnd,
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

    // The user's timezone decides which week they are in; the bounds are then
    // calendar days, like the occurrences they bracket. Monday is found from the
    // UTC weekday — `date-fns` `startOfWeek` reads the HOST's, which lands on a
    // different instant for every server that is not itself on UTC.
    const today = DateTimezoneUtils.currentCalendarDay(now, timezone);
    const startOfCurrentWeek = DateTimezoneUtils.shiftCalendarDays(
      today,
      -((today.getUTCDay() + 6) % 7),
    );
    const endOfCurrentWeek = DateTimezoneUtils.endOfCalendarDay(
      DateTimezoneUtils.shiftCalendarDays(startOfCurrentWeek, 6),
    );

    const totalThisWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      startOfCurrentWeek,
      endOfCurrentWeek,
    );

    const totalUpcomingWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      today,
      endOfCurrentWeek,
    );

    const trend = Array.from({ length: 7 }, (_, index) => {
      const dayStart = DateTimezoneUtils.shiftCalendarDays(
        startOfCurrentWeek,
        index,
      );
      const dailyTotal = AnalyticsCalculator.sumSpendInRange(
        subscriptions,
        dayStart,
        DateTimezoneUtils.endOfCalendarDay(dayStart),
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
