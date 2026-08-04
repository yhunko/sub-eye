import type {
  CategoryDto,
  CategorySpendingDto,
  CategorySpendingSubscriptionDto,
  DashboardAnalyticsDto,
  MonthlyTrendPoint,
  MostExpensiveSubscriptionDto,
  SubscriptionDto,
  SubscriptionPeriod,
  UpcomingRenewalDto,
} from "@subeye/shared";
import {
  DateTimezoneUtils,
  RecurrenceUtils,
  shouldIncludeOccurrence,
} from "@subeye/shared";
import { isAfter, isBefore } from "date-fns";
import { isOccurrencePaused } from "./pause";

/**
 * One projected payment event: a concrete date, the amount charged that day,
 * and the subscription it belongs to. A weekly subscription produces four or
 * five of these in a single month and every one of them counts toward spend.
 */
export type PaymentOccurrence = {
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
  ): number {
    const anchor = DateTimezoneUtils.toCalendarDay(subscription.paymentDate);

    let occurrence = RecurrenceUtils.getNextOccurrence(
      anchor,
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

      // Cancellation BREAKS above (nothing later can land). Pause SKIPS this
      // one occurrence but the projection continues — the first occurrence at
      // or after resume_at is charged in full.
      if (
        !isOccurrencePaused(
          { pausedAt: subscription.pausedAt, resumeAt: subscription.resumeAt },
          occurrence,
        )
      ) {
        total += AnalyticsCalculator.resolveOccurrenceAmount(
          subscription,
          occurrence,
        );
      }

      occurrence = RecurrenceUtils.addPeriod(
        occurrence,
        subscription.every,
        subscription.period as SubscriptionPeriod,
        { anchorDate: anchor },
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
    const base = DateTimezoneUtils.currentCalendarDay(baseDate, timezone);

    return Array.from({ length: monthCount }, (_, i) => {
      // The month bounds are calendar days, like the occurrences they bracket.
      // Zoned bounds excluded a charge landing on the 1st for any account west
      // of UTC, and counted it twice in the month before.
      const monthRef = DateTimezoneUtils.shiftCalendarMonths(base, i);
      const mStart = DateTimezoneUtils.startOfCalendarMonth(monthRef);
      const mEnd = DateTimezoneUtils.endOfCalendarMonth(monthRef);

      const payments = AnalyticsCalculator.collectPaymentsInRange(
        subscriptions,
        mStart,
        mEnd,
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
        // `date-fns` `format` reads the HOST's calendar; the month it labelled
        // was one day off whenever the bound was not a host-local midnight.
        date: mStart.toISOString().slice(0, 10),
        amount: Number(total.toFixed(2)),
        subscriptions: Array.from(subMap.values()).map((s) => ({
          ...s,
          amount: Number(s.amount.toFixed(2)),
        })),
      };
    });
  }

  /**
   * One entry per subscription: its NEXT charge, soonest first. The old
   * `projectUpcomingPayments` walked a full year of occurrences across every
   * subscription and threw away more than 95% of them to show five rows — a
   * weekly sub alone produced 52 objects to discard 51.
   */
  static nextOccurrenceRenewals(
    subscriptions: SubscriptionDto[],
    today: Date,
    preferredCurrencyCode: string,
  ): UpcomingRenewalDto[] {
    const renewals: UpcomingRenewalDto[] = [];
    const todayStart = today.getTime();

    for (const subscription of subscriptions) {
      const occurrence = RecurrenceUtils.getNextOccurrence(
        DateTimezoneUtils.toCalendarDay(subscription.paymentDate),
        subscription.every,
        subscription.period as SubscriptionPeriod,
        today,
      );

      if (
        !shouldIncludeOccurrence(
          { willBeCancelledAt: subscription.willBeCancelledAt },
          occurrence,
        )
      ) {
        continue;
      }
      // A charge that lands inside the pause window will not happen — showing
      // it as "upcoming" is a lie, so drop the subscription from the list.
      if (
        isOccurrencePaused(
          { pausedAt: subscription.pausedAt, resumeAt: subscription.resumeAt },
          occurrence,
        )
      ) {
        continue;
      }

      renewals.push({
        id: subscription.id,
        name: subscription.name,
        brandDomain: subscription.brandDomain,
        provider: "Subscription",
        amount: AnalyticsCalculator.resolveOccurrenceAmount(
          subscription,
          occurrence,
        ),
        currencyCode: preferredCurrencyCode,
        nextPaymentDate: new Date(occurrence.getTime()).toISOString(),
        // Both sides are UTC midnights — the occurrence by construction, `today`
        // because the caller passes `currentCalendarDay`. Re-flooring either in
        // the account's zone is what used to make this disagree with the same
        // countdown computed on the client.
        daysUntil: Math.round(
          (occurrence.getTime() - todayStart) / (24 * 60 * 60 * 1000),
        ),
      });
    }

    return renewals.sort((a, b) => a.daysUntil - b.daysUntil);
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
    const day = DateTimezoneUtils.currentCalendarDay(today, timezone);
    const monthStart = DateTimezoneUtils.startOfCalendarMonth(day);
    const monthEnd = DateTimezoneUtils.endOfCalendarMonth(day);
    // Stepped in calendar days rather than `eachDayOfInterval`, which walks the
    // HOST's zone and would shift every row of the forecast off a UTC midnight.
    const daysInMonth = Array.from(
      { length: monthEnd.getUTCDate() },
      (_, index) => DateTimezoneUtils.shiftCalendarDays(monthStart, index),
    );

    // Collect all payment occurrences in the month
    const monthPayments = AnalyticsCalculator.collectPaymentsInRange(
      subscriptions,
      monthStart,
      monthEnd,
    );

    const forecast: DashboardAnalyticsDto["cashFlowForecast"] = [];
    let cumulative = 0;
    let remainingThisMonth = 0;

    for (const targetDate of daysInMonth) {
      const dueToday = monthPayments.filter((payment) =>
        DateTimezoneUtils.isSameCalendarDay(payment.date, targetDate),
      );
      const dailyAmount = dueToday.reduce((sum, p) => sum + p.amount, 0);
      cumulative += dailyAmount;

      if (!isBefore(targetDate, day)) {
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
      const monthlyCost = sub.billing.preferred.monthly;

      if (existing) {
        existing.amount += monthlyCost;
        existing.subscriptions.push({
          id: sub.id,
          name: sub.name,
          brandDomain: sub.brandDomain,
          monthlyCost,
        });
      } else {
        const category = categories.find((c) => c.id === categoryId);
        map.set(categoryId, {
          categoryId,
          name: category?.name ?? "",
          emoji: category?.emoji ?? "📦",
          amount: monthlyCost,
          subscriptions: [
            {
              id: sub.id,
              name: sub.name,
              brandDomain: sub.brandDomain,
              monthlyCost,
            },
          ],
        });
      }
    }

    return Array.from(map.values())
      .filter((item) => item.amount > 0)
      .map((item) => {
        const groupedSubscriptions = new Map<
          string,
          CategorySpendingSubscriptionDto
        >();

        for (const subscription of item.subscriptions) {
          const existingSubscription = groupedSubscriptions.get(
            subscription.id,
          );
          if (existingSubscription) {
            existingSubscription.monthlyCost += subscription.monthlyCost;
            continue;
          }
          groupedSubscriptions.set(subscription.id, { ...subscription });
        }

        return {
          ...item,
          amount: Number(item.amount.toFixed(2)),
          subscriptions: Array.from(groupedSubscriptions.values())
            .map((subscription) => ({
              ...subscription,
              monthlyCost: Number(subscription.monthlyCost.toFixed(2)),
            }))
            .sort((a, b) => b.monthlyCost - a.monthlyCost),
        };
      })
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
  ): number {
    return subscriptions.reduce(
      (sum, sub) =>
        sum +
        AnalyticsCalculator.calculateSpendInRange(sub, rangeStart, rangeEnd),
      0,
    );
  }

  static hasUpcomingOccurrence(
    subscription: SubscriptionDto,
    fromDate: Date,
  ): boolean {
    const nextOccurrence = RecurrenceUtils.getNextOccurrence(
      DateTimezoneUtils.toCalendarDay(subscription.paymentDate),
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
  static collectPaymentsInRange(
    subscriptions: SubscriptionDto[],
    rangeStart: Date,
    rangeEnd: Date,
  ): PaymentOccurrence[] {
    const payments: PaymentOccurrence[] = [];

    for (const subscription of subscriptions) {
      const anchor = DateTimezoneUtils.toCalendarDay(subscription.paymentDate);
      let occurrence = RecurrenceUtils.getNextOccurrence(
        anchor,
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

        // Pause skips this occurrence but the range walk continues.
        if (
          isOccurrencePaused(
            {
              pausedAt: subscription.pausedAt,
              resumeAt: subscription.resumeAt,
            },
            occurrence,
          )
        ) {
          occurrence = RecurrenceUtils.addPeriod(
            occurrence,
            subscription.every,
            subscription.period as SubscriptionPeriod,
            { anchorDate: anchor },
          );
          continue;
        }

        payments.push({
          date: occurrence,
          amount: AnalyticsCalculator.resolveOccurrenceAmount(
            subscription,
            occurrence,
          ),
          subscription,
        });

        occurrence = RecurrenceUtils.addPeriod(
          occurrence,
          subscription.every,
          subscription.period as SubscriptionPeriod,
          { anchorDate: anchor },
        );
      }
    }

    return payments;
  }

  static resolveOccurrenceAmount(
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
