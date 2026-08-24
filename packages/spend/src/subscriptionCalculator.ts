import type {
  SubscriptionBillingDetails,
  SubscriptionPeriod,
} from "@subeye/model";
import { buildBillingDetails, type RateTable } from "@subeye/money";
import { DateTimezoneUtils, RecurrenceUtils } from "@subeye/time";

/** The minimum shape needed to price a subscription. A DB row satisfies it. */
export type BillableSubscription = {
  cost: string | number;
  currency: string;
  every: number;
  period: SubscriptionPeriod;
};

/** The minimum shape needed to walk a subscription's recurrence. */
export type RecurringSubscription = {
  every: number;
  period: SubscriptionPeriod;
  paymentDate: string | Date;
};

export class SubscriptionCalculator {
  static calculateBillingDetails(
    subscription: BillableSubscription,
    preferredCurrency: string,
    rates: RateTable,
  ): SubscriptionBillingDetails {
    return buildBillingDetails(
      {
        amount: Number(subscription.cost),
        currency: subscription.currency,
        every: subscription.every,
        period: subscription.period,
      },
      preferredCurrency,
      rates,
    );
  }

  static calculatePaymentDates(
    subscription: RecurringSubscription,
    timezone?: string,
    relativeTo: Date = DateTimezoneUtils.now(timezone),
  ): { nextPaymentDate: string; lastPaymentDate: string | null } {
    const every = subscription.every;
    const startDate = DateTimezoneUtils.toCalendarDay(subscription.paymentDate);
    const comparisonDate = DateTimezoneUtils.currentCalendarDay(
      relativeTo,
      timezone,
    );

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

    // Through `new Date` first: a `TZDate`'s own `toISOString()` emits the
    // offset form (`…+00:00`), and these strings are compared and sliced as
    // plain UTC instants by both clients.
    return {
      nextPaymentDate: new Date(nextPayment.getTime()).toISOString(),
      lastPaymentDate: lastPayment
        ? new Date(lastPayment.getTime()).toISOString()
        : null,
    };
  }
}
