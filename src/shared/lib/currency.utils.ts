import { Period } from "./db";

// Generic adapter interface
export interface ExchangeRate {
  currencyCodeA: number;
  currencyCodeB: number;
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}

export class CurrencyUtils {
  public static readonly DEFAULT_CURRENCY_CODE = 980;

  /**
   * Calculates the monthly cost based on the amount, interval, and period.
   * Standardizes logic for entire app.
   */
  static toMonthly(amount: number, every: number, period: Period): number {
    const interval = Math.max(1, every);

    switch (period) {
      case Period.DAY:
        return (amount * 30.44) / interval; // Average days in month
      case Period.WEEK:
        return (amount * 4.333) / interval; // Average weeks in month
      case Period.MONTH:
        return amount / interval;
      case Period.YEAR:
        return amount / 12 / interval;
      default:
        return amount;
    }
  }

  static convert(
    amount: number,
    fromCode: number,
    toCode: number,
    rates: ExchangeRate[],
  ): number {
    if (fromCode === toCode) return amount;

    // 1. Direct conversion
    const directRate = this.findRate(fromCode, toCode, rates);
    if (directRate !== null) {
      return amount * directRate;
    }

    // 2. Triangulation via UAH (Base Currency)
    const toUahRate = this.findRate(
      fromCode,
      this.DEFAULT_CURRENCY_CODE,
      rates,
    );
    const fromUahRate = this.findRate(
      this.DEFAULT_CURRENCY_CODE,
      toCode,
      rates,
    );

    if (toUahRate !== null && fromUahRate !== null) {
      return amount * toUahRate * fromUahRate;
    }

    return 0; // Or throw error depending on strictness requirements
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

    // A -> B (Bank Sells)
    if (pair.currencyCodeA === from && pair.currencyCodeB === to) {
      return pair.rateCross || pair.rateSell || null;
    }

    // B -> A (Bank Buys, so we invert)
    if (pair.currencyCodeA === to && pair.currencyCodeB === from) {
      const rate = pair.rateCross || pair.rateBuy;
      return rate ? 1 / rate : null;
    }

    return null;
  }
}
