import type {
  SubscriptionBillingDetails,
  SubscriptionPeriod,
} from "@subeye/model";
import { CurrencyUtils } from "./currency";
import type { RateTable } from "./rateTable";

/** What one recurring charge costs, in its own currency and in the user's. */
export type BillableAmount = {
  amount: number;
  currency: string;
  every: number;
  period: SubscriptionPeriod;
};

const getExchangeRate = (
  fromCode: string,
  toCode: string,
  rates: RateTable,
): number => {
  const from = CurrencyUtils.normalizeCode(fromCode);
  const to = CurrencyUtils.normalizeCode(toCode);

  if (from === to) return 1;
  const rate = rates[from];
  if (!rate) return 1;
  return 1 / rate;
};

export const buildBillingDetails = (
  { amount, currency, every, period }: BillableAmount,
  preferredCurrencyCode: string,
  rates: RateTable,
): SubscriptionBillingDetails => {
  const preferredAmount = CurrencyUtils.convert(
    amount,
    currency,
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
      currencyCode: currency,
      monthly: CurrencyUtils.toMonthly(amount, every, period),
    },
    preferred: {
      currencyCode: preferredCurrencyCode,
      amount: preferredAmount,
      monthly: preferredMonthly,
      // Derived from `monthly`, not from the raw amount: that is what makes a
      // yearly-billed subscription comparable against a monthly one.
      yearly: preferredMonthly * 12,
      exchangeRate: getExchangeRate(currency, preferredCurrencyCode, rates),
    },
  };
};
