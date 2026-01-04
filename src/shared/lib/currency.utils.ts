import { Period } from "./db";
import * as Sentry from "@sentry/nextjs";

export interface ExchangeRate {
  currencyCodeA: number;
  currencyCodeB: number;
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}

export class CurrencyUtils {
  public static readonly DEFAULT_CURRENCY_CODE = 980; // UAH

  /**
   * Calculates the monthly cost based on the amount, interval, and period.
   * Standardizes logic for entire app.
   */
  static toMonthly(amount: number, every: number, period: Period): number {
    const interval = Math.max(1, every);
    const safeAmount = Math.max(0, amount);

    switch (period) {
      case Period.DAY:
        return (safeAmount * 30.4375) / interval;
      case Period.WEEK:
        return (safeAmount * 4.345) / interval;
      case Period.MONTH:
        return safeAmount / interval;
      case Period.YEAR:
        return safeAmount / 12 / interval;
      default:
        return safeAmount;
    }
  }

  static convert(
    amount: number,
    fromCode: number,
    toCode: number,
    rates: ExchangeRate[],
  ): number {
    if (fromCode === toCode || amount === 0) return amount;

    // Try Direct
    const directRate = this.findRate(fromCode, toCode, rates);
    if (directRate !== null) {
      return amount * directRate;
    }

    // Try Triangulation via UAH
    if (
      fromCode !== this.DEFAULT_CURRENCY_CODE &&
      toCode !== this.DEFAULT_CURRENCY_CODE
    ) {
      const rateToUah = this.findRate(
        fromCode,
        this.DEFAULT_CURRENCY_CODE,
        rates,
      );
      const rateFromUah = this.findRate(
        this.DEFAULT_CURRENCY_CODE,
        toCode,
        rates,
      );

      if (rateToUah !== null && rateFromUah !== null) {
        return amount * rateToUah * rateFromUah;
      }
    }

    Sentry.captureException(
      `Exchange rate not found: ${fromCode} -> ${toCode}`,
      {
        extra: { method: "CurrencyUtils.convert" },
      },
    );
    return amount; // Fallback to original amount to avoid showing 0
  }

  private static findRate(
    from: number,
    to: number,
    rates: ExchangeRate[],
  ): number | null {
    const pair = rates.find(
      (r) =>
        (r.currencyCodeA === from && r.currencyCodeB === to) ||
        (r.currencyCodeA === to && r.currencyCodeB === from),
    );

    if (!pair) return null;

    const rawRate = pair.rateCross || pair.rateSell || pair.rateBuy;
    if (!rawRate) return null;

    // If the rate is defined as A/B (e.g. USD/UAH = 41)
    if (pair.currencyCodeA === from && pair.currencyCodeB === to) {
      return rawRate; // USD -> UAH: Multiply by 41
    }

    // If we want B -> A (e.g. UAH -> USD)
    if (pair.currencyCodeA === to && pair.currencyCodeB === from) {
      return 1 / rawRate; // UAH -> USD: Divide by 41
    }

    return null;
  }
}
