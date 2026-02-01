import { SubscriptionService } from "../subscription/subscriptionService";
import { UserService } from "../user/userService";
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { RecurrenceUtils } from "@shared/utils/recurrenceUtils";
import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
import { CurrencyUtils } from "@shared/utils/currencyUtils";
import type { SubscriptionDto } from "@shared/domains/subscription";
import type { SubscriptionPeriod } from "@shared/types";
import type {
  DashboardAnalyticsDto,
  MonthlySpendSummaryDto,
  MonthlySpendTrendPoint,
  MostExpensiveSubscriptionDto,
  UpcomingRenewalDto,
  WeeklyRenewalsSummaryDto,
} from "@shared/domains/analytics";

type AnalyticsServiceDeps = {
  subscriptionService: typeof SubscriptionService;
  userService: typeof UserService;
};

const defaultDeps: AnalyticsServiceDeps = {
  subscriptionService: SubscriptionService,
  userService: UserService,
};

export class AnalyticsService {
  static async getDashboardStats(
    userId: string,
    deps: AnalyticsServiceDeps = defaultDeps,
  ): Promise<DashboardAnalyticsDto> {
    const { subscriptions, preferredCurrencyCode, now } =
      await this.getAnalyticsContext(userId, deps);

    const today = startOfDay(now);
    const monthTrendStart = startOfMonth(today);
    const trendEnd = addMonths(monthTrendStart, 12);
    const oneYearFromNow = addMonths(today, 12);

    let monthlyBurnRate = 0;
    let activeSubscriptionsAuto = 0;
    let activeSubscriptionsManual = 0;
    let mostExpensiveSubscription: MostExpensiveSubscriptionDto = {
      name: "N/A",
      yearlyAmount: 0,
      brandDomain: null,
    };

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const monthKey = format(
        startOfMonth(addMonths(monthTrendStart, i)),
        "yyyy-MM-dd",
      );
      trendMap.set(monthKey, 0);
    }

    const allUpcomingPayments: UpcomingRenewalDto[] = [];

    for (const subscription of subscriptions) {
      monthlyBurnRate += subscription.billing.preferred.monthly;

      if (subscription.autoPaid) {
        activeSubscriptionsAuto += 1;
      } else {
        activeSubscriptionsManual += 1;
      }

      const yearlyCost = subscription.billing.preferred.monthly * 12;
      if (yearlyCost > mostExpensiveSubscription.yearlyAmount) {
        mostExpensiveSubscription = {
          name: subscription.name,
          yearlyAmount: yearlyCost,
          brandDomain: subscription.brandDomain,
        };
      }

      let projectionDate = RecurrenceUtils.getNextOccurrence(
        subscription.paymentDate,
        subscription.every,
        subscription.period as SubscriptionPeriod,
        today,
      );

      while (isBefore(projectionDate, oneYearFromNow)) {
        const daysUntil = Math.round(
          (projectionDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
        );
        allUpcomingPayments.push({
          id: subscription.id,
          name: subscription.name,
          brandDomain: subscription.brandDomain,
          provider: subscription.category ?? "Subscription",
          amount: subscription.billing.preferred.amount,
          currencyCode: preferredCurrencyCode,
          nextPaymentDate: projectionDate.toISOString(),
          daysUntil,
        });

        projectionDate = RecurrenceUtils.getNextOccurrence(
          projectionDate,
          subscription.every,
          subscription.period as SubscriptionPeriod,
          addDays(projectionDate, 1),
        );
      }

      let trendProjection = RecurrenceUtils.getNextOccurrence(
        subscription.paymentDate,
        subscription.every,
        subscription.period as SubscriptionPeriod,
        monthTrendStart,
      );

      while (isBefore(trendProjection, trendEnd)) {
        const monthKey = format(startOfMonth(trendProjection), "yyyy-MM-dd");
        if (trendMap.has(monthKey)) {
          const currentTotal = trendMap.get(monthKey) ?? 0;
          trendMap.set(
            monthKey,
            currentTotal + subscription.billing.preferred.amount,
          );
        }
        trendProjection = RecurrenceUtils.getNextOccurrence(
          trendProjection,
          subscription.every,
          subscription.period as SubscriptionPeriod,
          addDays(trendProjection, 1),
        );
      }
    }

    const upcomingRenewals = [...allUpcomingPayments]
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    const cashFlowForecast: DashboardAnalyticsDto["cashFlowForecast"] = [];
    let cumulative = 0;
    let remainingThisMonth = 0;

    for (let i = 0; i < 30; i++) {
      const targetDate = addDays(today, i);
      const dueToday = allUpcomingPayments.filter((payment) =>
        isSameDay(new Date(payment.nextPaymentDate), targetDate),
      );
      const dailyAmount = dueToday.reduce((sum, p) => sum + p.amount, 0);
      cumulative += dailyAmount;
      if (isSameMonth(targetDate, today)) {
        remainingThisMonth += dailyAmount;
      }
      cashFlowForecast.push({
        date: targetDate.toISOString(),
        amount: Number(dailyAmount.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
      });
    }

    const totalUpcomingMonth = cashFlowForecast.reduce(
      (acc, point) => acc + point.amount,
      0,
    );

    const monthlyTrend = Array.from(trendMap.entries()).map(
      ([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2)),
      }),
    );

    return {
      preferredCurrencyCode,
      monthlyBurnRate,
      yearlyForecast: monthlyBurnRate * 12,
      remainingThisMonth,
      activeSubscriptionsTotal: subscriptions.length,
      activeSubscriptionsAuto,
      activeSubscriptionsManual,
      mostExpensiveSubscription:
        mostExpensiveSubscription.yearlyAmount > 0
          ? mostExpensiveSubscription
          : null,
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

    const monthOffsets = [-4, -3, -2, -1, 0, 1];

    const trend: MonthlySpendTrendPoint[] = monthOffsets.map((offset) => {
      const monthStart = startOfMonth(addMonths(now, offset));
      const monthEnd = endOfMonth(addMonths(now, offset));
      const total = subscriptions.reduce(
        (sum, subscription) =>
          sum +
          this.calculateSpendForRange(
            subscription,
            subscription.billing.preferred.amount,
            monthStart,
            monthEnd,
            timezone,
          ),
        0,
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

    const totalThisWeek = subscriptions.reduce(
      (sum, subscription) =>
        sum +
        this.calculateSpendForRange(
          subscription,
          subscription.billing.preferred.amount,
          startOfCurrentWeek,
          endOfCurrentWeek,
          timezone,
        ),
      0,
    );

    const totalUpcomingWeek = subscriptions.reduce(
      (sum, subscription) =>
        sum +
        this.calculateSpendForRange(
          subscription,
          subscription.billing.preferred.amount,
          startOfDay(now),
          endOfCurrentWeek,
          timezone,
        ),
      0,
    );

    const daysInWeek = eachDayOfInterval({
      start: startOfCurrentWeek,
      end: endOfCurrentWeek,
    });

    const trend = daysInWeek.map((day) => {
      const dayStart = startOfDay(day);
      const dailyTotal = subscriptions.reduce(
        (sum, subscription) =>
          sum +
          this.calculateSpendForRange(
            subscription,
            subscription.billing.preferred.amount,
            dayStart,
            endOfDay(dayStart),
            timezone,
          ),
        0,
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

  private static calculateSpendForRange(
    subscription: SubscriptionDto,
    perPaymentAmount: number,
    rangeStart: Date,
    rangeEnd: Date,
    timezone?: string,
  ): number {
    const startDateZoned = DateTimezoneUtils.toZoned(
      subscription.paymentDate,
      timezone,
    );

    let occurrence = RecurrenceUtils.getNextOccurrence(
      startDateZoned,
      subscription.every,
      subscription.period as SubscriptionPeriod,
      rangeStart,
    );

    let total = 0;

    while (!isAfter(occurrence, rangeEnd)) {
      total += perPaymentAmount;
      occurrence = RecurrenceUtils.addPeriod(
        occurrence,
        subscription.every,
        subscription.period as SubscriptionPeriod,
      );
    }

    return total;
  }
}
