import { format, isAfter, isBefore, eachDayOfInterval } from "date-fns";
import { RecurrenceUtils } from "shared";
import { DateTimezoneUtils } from "shared";
import type { CategoryDto, SubscriptionDto } from "shared";
import { shouldIncludeOccurrence } from "shared";
import type { SubscriptionPeriod } from "shared";
import type {
  CategorySpendingDto,
  DashboardAnalyticsDto,
  MonthlyTrendPoint,
  MostExpensiveSubscriptionDto,
  UpcomingRenewalDto,
} from "shared";

type PaymentOccurrence = {
  date: Date;
  amount: number;
  subscription: SubscriptionDto;
};

/**
 * Pure calculation logic for analytics — no IO, no DB.
 * Handles all date-based occurrence projections and spend aggregation.
 */
export class AnalyticsCalculator {
  /**
   * Sums recurring payment amounts that fall within [rangeStart, rangeEnd].
   * This is the single source of truth for "how much does a subscription cost in a date range".
   */
  static calculateSpendInRange(
    subscription: SubscriptionDto,
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
      if (
        !shouldIncludeOccurrence(
          {
            willBeCancelledAt: subscription.willBeCancelledAt,
          },
          occurrence,
        )
      ) {
        break;
      }

      total += this.resolveOccurrenceAmount(subscription, occurrence);
      occurrence = RecurrenceUtils.addPeriod(
        occurrence,
        subscription.every,
        subscription.period as SubscriptionPeriod,
        { anchorDate: startDateZoned },
      );
    }

    return total;
  }

  /**
   * Aggregates total spend across all subscriptions for each month in a range.
   */
  static buildMonthlyTrend(
    subscriptions: SubscriptionDto[],
    baseDate: Date,
    monthCount: number,
    timezone?: string,
  ): MonthlyTrendPoint[] {
    return Array.from({ length: monthCount }, (_, i) => {
      const monthRef = DateTimezoneUtils.shiftMonths(baseDate, i, timezone);
      const mStart = DateTimezoneUtils.startOfMonth(monthRef, timezone);
      const mEnd = DateTimezoneUtils.endOfMonth(monthRef, timezone);

      const payments = this.collectPaymentsInRange(
        subscriptions,
        mStart,
        mEnd,
        timezone,
      );

      const total = payments.reduce((sum, p) => sum + p.amount, 0);

      // Group by subscription to handle multiple payments in one month (e.g. weekly)
      const subMap = new Map<
        string,
        {
          id: string;
          name: string;
          brandDomain: string | null;
          amount: number;
          currencyCode: string;
        }
      >();

      for (const payment of payments) {
        const existing = subMap.get(payment.subscription.id);
        if (existing) {
          existing.amount += payment.amount;
        } else {
          subMap.set(payment.subscription.id, {
            id: payment.subscription.id,
            name: payment.subscription.name,
            brandDomain: payment.subscription.brandDomain,
            amount: payment.subscription.billing.preferred.amount, // Base amount, but we sum payment.amount for multiple occurrences
            currencyCode: payment.subscription.billing.preferred.currencyCode,
          });
          // Fix initial amount to be this payment's amount (which is same as preferred usually, but logical correctness)
          subMap.get(payment.subscription.id)!.amount = payment.amount;
        }
      }

      return {
        date: format(mStart, "yyyy-MM-dd"),
        amount: Number(total.toFixed(2)),
        subscriptions: Array.from(subMap.values()).map((s) => ({
          ...s,
          amount: Number(s.amount.toFixed(2)),
        })),
      };
    });
  }

  /**
   * Projects all upcoming payment occurrences within a time horizon.
   */
  static projectUpcomingPayments(
    subscriptions: SubscriptionDto[],
    today: Date,
    horizon: Date,
    preferredCurrencyCode: string,
    timezone?: string,
  ): UpcomingRenewalDto[] {
    const payments: UpcomingRenewalDto[] = [];

    for (const subscription of subscriptions) {
      const paymentDateZoned = DateTimezoneUtils.toZoned(
        subscription.paymentDate,
        timezone,
      );

      let projectionDate = RecurrenceUtils.getNextOccurrence(
        paymentDateZoned,
        subscription.every,
        subscription.period as SubscriptionPeriod,
        today,
      );

      while (isBefore(projectionDate, horizon)) {
        if (
          !shouldIncludeOccurrence(
            {
              willBeCancelledAt: subscription.willBeCancelledAt,
            },
            projectionDate,
          )
        ) {
          break;
        }

        const daysUntil = Math.round(
          (DateTimezoneUtils.startOfDay(projectionDate, timezone).getTime() -
            DateTimezoneUtils.startOfDay(today, timezone).getTime()) /
            (24 * 60 * 60 * 1000),
        );
        payments.push({
          id: subscription.id,
          name: subscription.name,
          brandDomain: subscription.brandDomain,
          provider: "Subscription",
          amount: this.resolveOccurrenceAmount(subscription, projectionDate),
          currencyCode: preferredCurrencyCode,
          nextPaymentDate: projectionDate.toISOString(),
          daysUntil,
        });

        projectionDate = RecurrenceUtils.addPeriod(
          projectionDate,
          subscription.every,
          subscription.period as SubscriptionPeriod,
          { anchorDate: paymentDateZoned },
        );
      }
    }

    return payments;
  }

  /**
   * Builds per-day cash flow data for the current month.
   * Returns individual day amounts, running cumulative total,
   * and remaining spend from today onward.
   */
  static buildCashFlowForecast(
    subscriptions: SubscriptionDto[],
    today: Date,
    timezone?: string,
  ): {
    forecast: DashboardAnalyticsDto["cashFlowForecast"];
    remainingThisMonth: number;
    totalUpcomingMonth: number;
  } {
    const monthStart = DateTimezoneUtils.startOfMonth(today, timezone);
    const monthEnd = DateTimezoneUtils.endOfMonth(today, timezone);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Collect all payment occurrences in the month
    const monthPayments = this.collectPaymentsInRange(
      subscriptions,
      monthStart,
      monthEnd,
      timezone,
    );

    const forecast: DashboardAnalyticsDto["cashFlowForecast"] = [];
    let cumulative = 0;
    let remainingThisMonth = 0;

    for (const targetDate of daysInMonth) {
      const dueToday = monthPayments.filter((payment) =>
        DateTimezoneUtils.isSameDay(payment.date, targetDate, timezone),
      );
      const dailyAmount = dueToday.reduce((sum, p) => sum + p.amount, 0);
      cumulative += dailyAmount;

      if (!isBefore(targetDate, today)) {
        remainingThisMonth += dailyAmount;
      }

      forecast.push({
        date: targetDate.toISOString(),
        amount: Number(dailyAmount.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
        subscriptions: dueToday.map((p) => ({
          name: p.subscription.name,
          brandDomain: p.subscription.brandDomain,
          amount: Number(p.amount.toFixed(2)),
        })),
      });
    }

    const totalUpcomingMonth = forecast.reduce(
      (acc, point) => acc + point.amount,
      0,
    );

    return { forecast, remainingThisMonth, totalUpcomingMonth };
  }

  /**
   * Groups active subscriptions by category and sums their monthly spend.
   * Returns entries sorted by amount descending; uncategorized items have categoryId = null.
   */
  static buildCategorySpending(
    subscriptions: SubscriptionDto[],
    categories: CategoryDto[],
  ): CategorySpendingDto[] {
    const map = new Map<string | null, CategorySpendingDto>();

    for (const sub of subscriptions) {
      const categoryId = sub.categoryId ?? null;
      const existing = map.get(categoryId);
      if (existing) {
        existing.amount += sub.billing.preferred.monthly;
      } else {
        const category = categories.find((c) => c.id === categoryId);
        map.set(categoryId, {
          categoryId,
          name: category?.name ?? "",
          emoji: category?.emoji ?? "📦",
          amount: sub.billing.preferred.monthly,
        });
      }
    }

    return Array.from(map.values())
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Finds the single most expensive subscription by yearly cost.
   */
  static findMostExpensive(
    subscriptions: SubscriptionDto[],
  ): MostExpensiveSubscriptionDto | null {
    let best: MostExpensiveSubscriptionDto | null = null;

    for (const sub of subscriptions) {
      const yearlyCost = sub.billing.preferred.monthly * 12;
      if (!best || yearlyCost > best.yearlyAmount) {
        best = {
          name: sub.name,
          yearlyAmount: yearlyCost,
          brandDomain: sub.brandDomain,
        };
      }
    }

    return best && best.yearlyAmount > 0 ? best : null;
  }

  /**
   * Aggregates total spend across subscriptions within a date range.
   */
  static sumSpendInRange(
    subscriptions: SubscriptionDto[],
    rangeStart: Date,
    rangeEnd: Date,
    timezone?: string,
  ): number {
    return subscriptions.reduce(
      (sum, sub) =>
        sum + this.calculateSpendInRange(sub, rangeStart, rangeEnd, timezone),
      0,
    );
  }

  static hasUpcomingOccurrence(
    subscription: SubscriptionDto,
    fromDate: Date,
    timezone?: string,
  ): boolean {
    const paymentDateZoned = DateTimezoneUtils.toZoned(
      subscription.paymentDate,
      timezone,
    );
    const nextOccurrence = RecurrenceUtils.getNextOccurrence(
      paymentDateZoned,
      subscription.every,
      subscription.period as SubscriptionPeriod,
      fromDate,
    );

    return shouldIncludeOccurrence(
      { willBeCancelledAt: subscription.willBeCancelledAt },
      nextOccurrence,
    );
  }

  /**
   * Collects individual payment occurrences for all subscriptions in a range.
   */
  private static collectPaymentsInRange(
    subscriptions: SubscriptionDto[],
    rangeStart: Date,
    rangeEnd: Date,
    timezone?: string,
  ): PaymentOccurrence[] {
    const payments: PaymentOccurrence[] = [];

    for (const subscription of subscriptions) {
      const paymentDateZoned = DateTimezoneUtils.toZoned(
        subscription.paymentDate,
        timezone,
      );
      let occurrence = RecurrenceUtils.getNextOccurrence(
        paymentDateZoned,
        subscription.every,
        subscription.period as SubscriptionPeriod,
        rangeStart,
      );

      while (!isAfter(occurrence, rangeEnd)) {
        const include = shouldIncludeOccurrence(
          { willBeCancelledAt: subscription.willBeCancelledAt },
          occurrence,
        );

        if (!include) break;

        payments.push({
          date: occurrence,
          amount: this.resolveOccurrenceAmount(subscription, occurrence),
          subscription,
        });

        occurrence = RecurrenceUtils.addPeriod(
          occurrence,
          subscription.every,
          subscription.period as SubscriptionPeriod,
          { anchorDate: paymentDateZoned },
        );
      }
    }

    return payments;
  }

  private static resolveOccurrenceAmount(
    subscription: SubscriptionDto,
    occurrence: Date,
  ): number {
    const scheduled = subscription.scheduledPriceChange;

    if (!scheduled) {
      return subscription.billing.preferred.amount;
    }

    const effectiveAt = Date.parse(scheduled.effectiveAt);
    if (Number.isNaN(effectiveAt)) {
      return subscription.billing.preferred.amount;
    }

    return occurrence.getTime() >= effectiveAt
      ? scheduled.billing.preferred.amount
      : subscription.billing.preferred.amount;
  }
}
