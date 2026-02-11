import { SubscriptionService } from "../subscription/subscriptionService";
import { UserService } from "../user/userService";
import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
import { CurrencyUtils } from "@shared/utils/currencyUtils";
import type {
  DashboardAnalyticsDto,
  MonthlySpendSummaryDto,
  MonthlySpendTrendPoint,
  WeeklyRenewalsSummaryDto,
} from "@shared/domains/analytics";
import { AnalyticsCalculator } from "./analyticsCalculator";

type AnalyticsServiceDeps = {
  subscriptionService: typeof SubscriptionService;
  userService: typeof UserService;
};

const defaultDeps: AnalyticsServiceDeps = {
  subscriptionService: SubscriptionService,
  userService: UserService,
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
    const { subscriptions, preferredCurrencyCode, now, timezone } =
      await this.getAnalyticsContext(userId, deps);

    const today = startOfDay(now);
    const oneYearFromNow = addMonths(today, 12);

    // Aggregate subscription stats
    let monthlyBurnRate = 0;
    let activeSubscriptionsAuto = 0;
    let activeSubscriptionsManual = 0;

    for (const sub of subscriptions) {
      monthlyBurnRate += sub.billing.preferred.monthly;
      if (sub.autoPaid) {
        activeSubscriptionsAuto += 1;
      } else {
        activeSubscriptionsManual += 1;
      }
    }

    // Delegate all projections to calculator
    const mostExpensiveSubscription =
      AnalyticsCalculator.findMostExpensive(subscriptions);

    const allUpcomingPayments = AnalyticsCalculator.projectUpcomingPayments(
      subscriptions,
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
      subscriptions,
      today,
      timezone,
    );

    const monthlyTrend = AnalyticsCalculator.buildMonthlyTrend(
      subscriptions,
      today,
      12,
      timezone,
    );

    return {
      preferredCurrencyCode,
      monthlyBurnRate,
      yearlyForecast: monthlyBurnRate * 12,
      remainingThisMonth,
      activeSubscriptionsTotal: subscriptions.length,
      activeSubscriptionsAuto,
      activeSubscriptionsManual,
      mostExpensiveSubscription,
      cashFlowForecast,
      upcomingRenewals,
      totalUpcomingMonth,
      monthlyTrend,
    };
  }

  static async getMonthlySpendSummary(
    userId: string,
    deps: AnalyticsServiceDeps = defaultDeps,
  ): Promise<MonthlySpendSummaryDto> {
    const { subscriptions, timezone, preferredCurrencyCode, now } =
      await this.getAnalyticsContext(userId, deps);

    const monthOffsets = [-1, 0, 1, 2, 3, 4, 5, 6];

    const trend: MonthlySpendTrendPoint[] = monthOffsets.map((offset) => {
      const monthStart = startOfMonth(addMonths(now, offset));
      const monthEnd = endOfMonth(addMonths(now, offset));
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
      await this.getAnalyticsContext(userId, deps);

    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });

    const totalThisWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      startOfCurrentWeek,
      endOfCurrentWeek,
      timezone,
    );

    const totalUpcomingWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      startOfDay(now),
      endOfCurrentWeek,
      timezone,
    );

    const daysInWeek = eachDayOfInterval({
      start: startOfCurrentWeek,
      end: endOfCurrentWeek,
    });

    const trend = daysInWeek.map((day) => {
      const dayStart = startOfDay(day);
      const dailyTotal = AnalyticsCalculator.sumSpendInRange(
        subscriptions,
        dayStart,
        endOfDay(dayStart),
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
    const subscriptions = await deps.subscriptionService.getSubscriptions(
      userId,
      {},
    );
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
