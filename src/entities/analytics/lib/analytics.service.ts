import { SubscriptionService } from "../../subscription/lib/subscription.service";
import {
  DashboardAnalyticsDto,
  MonthlySpendSummaryDto,
  MostExpensiveSubscriptionDto,
  UpcomingRenewalDto,
  WeeklyRenewalsSummaryDto,
} from "../model/analytics.dtos";
import {
  addDays,
  addMonths,
  endOfMonth,
  isSameDay,
  startOfDay,
  differenceInCalendarDays,
  isSameMonth,
  format,
  startOfMonth,
  isAfter,
  isBefore,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  endOfDay,
} from "date-fns";
import { RecurrenceUtils } from "@/shared/lib/recurrence.utils";
import { CurrencyUtils } from "@/shared/lib/currency.utils";
import { DateTimezoneUtils } from "@/shared/lib";
import { SubscriptionSchema } from "@/shared/lib/db/schema";
import { UserService } from "../../user/lib/user.service";

export class AnalyticsService {
  constructor(
    private subscriptionService = new SubscriptionService(),
    private userService = new UserService(),
  ) {}

  async getDashboardStats(userId: string): Promise<DashboardAnalyticsDto> {
    const { subscriptions, preferredCurrencyCode, now } =
      await this.getAnalyticsContext(userId);

    const today = startOfDay(now);

    let monthlyBurnRate = 0;
    let activeSubscriptionsAuto = 0;
    let activeSubscriptionsManual = 0;

    let mostExpensiveSubscription: MostExpensiveSubscriptionDto = {
      name: "N/A",
      yearlyAmount: 0,
      brandDomain: "",
    };

    const trendMap = new Map<string, number>();
    const monthTrendStart = startOfMonth(today);
    for (let i = 0; i < 12; i++) {
      const monthKey = format(
        startOfMonth(addMonths(monthTrendStart, i)),
        "yyyy-MM-dd",
      );
      trendMap.set(monthKey, 0);
    }
    const oneYearFromNow = addMonths(today, 12);
    const trendEnd = addMonths(monthTrendStart, 12);

    // Store every individual payment occurrence across all subs
    const allUpcomingPayments: UpcomingRenewalDto[] = [];

    subscriptions.forEach((subscription) => {
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

      // Calculate individual occurrences
      let projectionDate = RecurrenceUtils.getNextOccurrence(
        subscription.paymentDate,
        subscription.every,
        subscription.period,
        today,
      );

      // Initial "nextDate" for the mappedSubscriptions return object
      const firstNextDate = projectionDate;

      // Generate occurrences for the next year to cover upcomingRenewals
      while (isBefore(projectionDate, oneYearFromNow)) {
        const daysUntil = differenceInCalendarDays(projectionDate, today);

        allUpcomingPayments.push({
          id: subscription.id,
          name: subscription.name,
          brandDomain: subscription.brandDomain,
          provider: subscription.category || "Subscription",
          amount: subscription.billing.preferred.amount,
          currencyCode: preferredCurrencyCode,
          nextPaymentDate: projectionDate.toISOString(),
          daysUntil: daysUntil,
        });

        projectionDate = RecurrenceUtils.getNextOccurrence(
          projectionDate,
          subscription.every,
          subscription.period,
          addDays(projectionDate, 1),
        );
      }

      // Generate occurrences for trendMap starting from the beginning of the current month
      let trendProjection = RecurrenceUtils.getNextOccurrence(
        subscription.paymentDate,
        subscription.every,
        subscription.period,
        monthTrendStart,
      );

      while (isBefore(trendProjection, trendEnd)) {
        const monthKey = format(startOfMonth(trendProjection), "yyyy-MM-dd");
        if (trendMap.has(monthKey)) {
          const currentTotal = trendMap.get(monthKey) || 0;
          trendMap.set(
            monthKey,
            currentTotal + subscription.billing.preferred.amount,
          );
        }

        trendProjection = RecurrenceUtils.getNextOccurrence(
          trendProjection,
          subscription.every,
          subscription.period,
          addDays(trendProjection, 1),
        );
      }

      return {
        ...subscription,
        nextPaymentDate: firstNextDate,
        daysUntil: differenceInCalendarDays(firstNextDate, today),
      };
    });

    const upcomingRenewals = allUpcomingPayments
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    const cashFlowForecast = [];
    let cumulative = 0;
    let remainingThisMonth = 0;

    for (let i = 0; i < 30; i++) {
      const targetDate = addDays(today, i);
      const dueToday = allUpcomingPayments.filter((payment) =>
        isSameDay(new Date(payment.nextPaymentDate), targetDate),
      );

      const dailyAmount = dueToday.reduce((sum, p) => sum + p.amount, 0);

      cumulative += dailyAmount;
      if (isSameMonth(targetDate, today)) remainingThisMonth += dailyAmount;
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
      mostExpensiveSubscription,
      cashFlowForecast,
      upcomingRenewals,
      totalUpcomingMonth,
      monthlyTrend,
    };
  }

  async getMonthlySpendSummary(
    userId: string,
  ): Promise<MonthlySpendSummaryDto> {
    const { subscriptions, timezone, preferredCurrencyCode, now } =
      await this.getAnalyticsContext(userId);

    const monthOffsets = [-4, -3, -2, -1, 0, 1];

    const trend = monthOffsets.map((offset) => {
      const monthStart = startOfMonth(addMonths(now, offset));
      const monthEnd = endOfMonth(addMonths(now, offset));
      const total = subscriptions.reduce(
        (sum, subscription) =>
          sum +
          AnalyticsService.calculateSpendForRange(
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

  async getWeeklyRenewalsSummary(
    userId: string,
  ): Promise<WeeklyRenewalsSummaryDto> {
    const { subscriptions, timezone, preferredCurrencyCode, now } =
      await this.getAnalyticsContext(userId);

    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });

    const totalThisWeek = subscriptions.reduce(
      (sum, subscription) =>
        sum +
        AnalyticsService.calculateSpendForRange(
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
        AnalyticsService.calculateSpendForRange(
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
          AnalyticsService.calculateSpendForRange(
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

  private async getAnalyticsContext(userId: string) {
    const subscriptions =
      await this.subscriptionService.getSubscriptionsForUser(userId);
    const metadata = await this.userService.getUserPreferences(userId);

    const preferredCurrency = metadata.preferredCurrency;
    const timezone = metadata.preferredTimezone;

    const normalizedCurrency = CurrencyUtils.normalizeCode(preferredCurrency);
    const preferredCurrencyCode =
      subscriptions[0]?.billing.preferred.currencyCode ?? normalizedCurrency;

    const now = DateTimezoneUtils.now(timezone);

    return {
      subscriptions,
      metadata,
      preferredCurrencyCode,
      timezone,
      now,
    };
  }

  private static calculateSpendForRange(
    subscription: {
      paymentDate: string;
      every: number;
      period: SubscriptionSchema["period"];
    },
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
      subscription.period,
      rangeStart,
    );

    let total = 0;

    while (!isAfter(occurrence, rangeEnd)) {
      total += perPaymentAmount;
      occurrence = RecurrenceUtils.addPeriod(
        occurrence,
        subscription.every,
        subscription.period,
      );
    }

    return total;
  }
}
