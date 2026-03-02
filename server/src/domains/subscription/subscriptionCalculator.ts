import { CurrencyUtils } from "shared";
import { DateTimezoneUtils } from "shared";
import { RecurrenceUtils } from "shared";
import type { SubscriptionBillingDetails } from "shared";
import type { SubscriptionPeriod } from "shared";
import type { SubscriptionRecord } from "./subscriptionRepository";

export class SubscriptionCalculator {
  static calculateBillingDetails(
    subscription: SubscriptionRecord,
    preferredCurrency: string,
    rates: Record<string, number>,
  ): SubscriptionBillingDetails {
    return this.computeBillingDetails(
      Number(subscription.cost),
      subscription.currency,
      subscription.every,
      subscription.period,
      preferredCurrency,
      rates,
    );
  }

  static calculateBillingDetailsForPricing(
    {
      amount,
      currency,
      every,
      period,
    }: {
      amount: number;
      currency: string;
      every: number;
      period: SubscriptionPeriod;
    },
    preferredCurrency: string,
    rates: Record<string, number>,
  ): SubscriptionBillingDetails {
    return this.computeBillingDetails(
      amount,
      currency,
      every,
      period,
      preferredCurrency,
      rates,
    );
  }

  static calculatePaymentDates(
    subscription: SubscriptionRecord,
    timezone?: string,
    relativeTo: Date = DateTimezoneUtils.now(timezone),
  ): { nextPaymentDate: string; lastPaymentDate: string | null } {
    const every = subscription.every;
    const startDate = DateTimezoneUtils.toZoned(
      subscription.paymentDate,
      timezone,
    );
    const comparisonDate = DateTimezoneUtils.startOfDay(relativeTo, timezone);

    const nextPayment = RecurrenceUtils.getNextOccurrence(
      startDate,
      every,
      subscription.period,
      comparisonDate,
    );
    const lastPayment = RecurrenceUtils.getPreviousOccurrence(
      startDate,
      every,
      subscription.period,
      comparisonDate,
    );

    return {
      nextPaymentDate: nextPayment.toISOString(),
      lastPaymentDate: lastPayment ? lastPayment.toISOString() : null,
    };
  }

  private static getExchangeRate(
    from: string,
    to: string,
    rates: Record<string, number>,
  ): number {
    if (from === to) return 1;
    const rate = rates[from];
    if (!rate) return 1;
    return 1 / rate;
  }

  private static computeBillingDetails(
    amount: number,
    originalCurrency: string,
    every: number,
    period: SubscriptionPeriod,
    preferredCurrencyCode: string,
    rates: Record<string, number>,
  ): SubscriptionBillingDetails {
    const originalMonthly = CurrencyUtils.toMonthly(amount, every, period);
    const preferredAmount = CurrencyUtils.convert(
      amount,
      originalCurrency,
      preferredCurrencyCode,
      rates,
    );
    const preferredMonthly = CurrencyUtils.toMonthly(
      preferredAmount,
      every,
      period,
    );

    return {
      original: {
        currencyCode: originalCurrency,
        monthly: originalMonthly,
      },
      preferred: {
        currencyCode: preferredCurrencyCode,
        amount: preferredAmount,
        monthly: preferredMonthly,
        yearly: preferredMonthly * 12,
        exchangeRate: this.getExchangeRate(
          originalCurrency,
          preferredCurrencyCode,
          rates,
        ),
      },
    };
  }
}
