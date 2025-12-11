import { MonobankCurrencyDto } from "../model/dtos";
import { Period } from "@/shared/lib/db";

export class CurrencyUtils {
  private static readonly UAH_CODE = 980;

  /**
   * Calculates the monthly cost based on the amount, interval, and period.
   * Example: $5.90 every 4 weeks -> $6.39
   */
  static toMonthly(amount: number, every: number, period: Period): number {
    // Sanity check to avoid division by zero
    const interval = Math.max(1, every);

    switch (period) {
      case Period.DAY:
        // 30 days roughly, or 365/12
        return (amount * 30.44) / interval;
      case Period.WEEK:
        // 52 weeks / 12 months = 4.333...
        return (amount * 4.333) / interval;
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
    rates: MonobankCurrencyDto[],
  ): number {
    if (fromCode === toCode) return amount;

    // 1. Direct conversion
    const directRate = this.findRate(fromCode, toCode, rates);
    if (directRate !== null) {
      return amount * directRate;
    }

    // 2. Triangulation via UAH, since Monobank is UAH bank
    const toUahRate = this.findRate(fromCode, this.UAH_CODE, rates);
    const fromUahRate = this.findRate(this.UAH_CODE, toCode, rates);

    if (toUahRate !== null && fromUahRate !== null) {
      return amount * toUahRate * fromUahRate;
    }

    return 0;
  }

  private static findRate(
    from: number,
    to: number,
    rates: MonobankCurrencyDto[],
  ): number | null {
    const pair = rates.find(
      (r) =>
        (r.currencyCodeA === from && r.currencyCodeB === to) ||
        (r.currencyCodeA === to && r.currencyCodeB === from),
    );

    if (!pair) return null;

    // CASE 1: Foreign (A) -> Local (B)
    // Example: USD (840) -> UAH (980)
    // Bank SELLS us USD (A) in exchange for our UAH (B).
    if (pair.currencyCodeA === from && pair.currencyCodeB === to) {
      return pair.rateCross || pair.rateSell;
    }

    // CASE 2: Local (B) -> Foreign (A)
    // Example: UAH (980) -> USD (840)
    // We want to know how much Foreign currency equals our Local amount.
    // Logic: X USD * rateBuy = Local Amount. -> X = Local / rateBuy
    if (pair.currencyCodeA === to && pair.currencyCodeB === from) {
      const rate = pair.rateCross || pair.rateBuy;
      return rate ? 1 / rate : null;
    }

    return null;
  }
}
