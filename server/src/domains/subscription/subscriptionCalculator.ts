import { CurrencyUtils } from "@shared/utils/currencyUtils";
import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
import { RecurrenceUtils } from "@shared/utils/recurrenceUtils";
import type { SubscriptionBillingDetails } from "@shared/domains/subscription/subscriptionSchemas";
import type { SubscriptionRecord } from "./subscriptionRepository";

export class SubscriptionCalculator {
  static calculateBillingDetails(
    subscription: SubscriptionRecord,
    preferredCurrency: string,
    rates: Record<string, number>,
  ): SubscriptionBillingDetails {
    const amount = Number(subscription.cost);
    const every = subscription.every;
    const period = subscription.period;

    const originalCurrency = subscription.currency;
    const preferredCurrencyCode = preferredCurrency;

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

    const nextPayment = RecurrenceUtils.getNextOccurrence(
      startDate,
      every,
      subscription.period,
      relativeTo,
    );
    const lastPayment = RecurrenceUtils.getPreviousOccurrence(
      startDate,
      every,
      subscription.period,
      relativeTo,
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
}
