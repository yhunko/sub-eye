import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { RecurrenceUtils } from "@shared/utils/recurrenceUtils";
import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
import type { SubscriptionDto } from "@shared/domains/subscription";
import type { SubscriptionPeriod } from "@shared/types";
import type {
  DashboardAnalyticsDto,
  MonthlySpendTrendPoint,
  MostExpensiveSubscriptionDto,
  UpcomingRenewalDto,
} from "@shared/domains/analytics";

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

    let occurrence = RecurrenceUtils.getFirstOccurrenceOnOrAfter(
      startDateZoned,
      subscription.every,
      subscription.period as SubscriptionPeriod,
      rangeStart,
    );

    let total = 0;
    const amount = subscription.billing.preferred.amount;

    while (!isAfter(occurrence, rangeEnd)) {
      if (
        subscription.cancelledAt &&
        !isBefore(occurrence, new Date(subscription.nextPaymentDate))
      ) {
        break;
      }

      total += amount;
      occurrence = RecurrenceUtils.addPeriod(
        occurrence,
        subscription.every,
        subscription.period as SubscriptionPeriod,
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
  ): MonthlySpendTrendPoint[] {
    return Array.from({ length: monthCount }, (_, i) => {
      const mStart = startOfMonth(addMonths(baseDate, i));
      const mEnd = endOfMonth(addMonths(baseDate, i));
      const total = this.sumSpendInRange(subscriptions, mStart, mEnd, timezone);
      return {
        date: format(mStart, "yyyy-MM-dd"),
        amount: Number(total.toFixed(2)),
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
          subscription.cancelledAt &&
          !isBefore(projectionDate, new Date(subscription.nextPaymentDate))
        ) {
          break;
        }

        const daysUntil = Math.round(
          (projectionDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
        );
        payments.push({
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
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
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
        isSameDay(payment.date, targetDate),
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
      let occurrence = RecurrenceUtils.getFirstOccurrenceOnOrAfter(
        paymentDateZoned,
        subscription.every,
        subscription.period as SubscriptionPeriod,
        rangeStart,
      );

      while (!isAfter(occurrence, rangeEnd)) {
        if (
          subscription.cancelledAt &&
          !isBefore(occurrence, new Date(subscription.nextPaymentDate))
        ) {
          break;
        }

        payments.push({
          date: occurrence,
          amount: subscription.billing.preferred.amount,
          subscription,
        });
        occurrence = RecurrenceUtils.addPeriod(
          occurrence,
          subscription.every,
          subscription.period as SubscriptionPeriod,
        );
      }
    }

    return payments;
  }
}
