import type { SubscriptionPeriod } from "@subeye/model";
import { CurrencyUtils } from "@subeye/money";

/**
 * What a price change costs — or saves — over a year, in the subscription's own
 * currency.
 *
 * The number people are actually deciding about. "£11 instead of £10" is not
 * the question; "£12 a year" is, and on a weekly subscription the same £1 is
 * £52.
 *
 * Normalised through `toMonthly` on BOTH sides rather than on the difference:
 * that helper floors its input at zero, so handing it a drop in price would
 * report no change at all.
 */
export function yearlyDifference(
  from: number,
  to: number,
  every: number,
  period: SubscriptionPeriod,
): number {
  return (
    (CurrencyUtils.toMonthly(to, every, period) -
      CurrencyUtils.toMonthly(from, every, period)) *
    12
  );
}
