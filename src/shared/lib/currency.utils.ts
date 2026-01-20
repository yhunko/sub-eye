import { Period } from "./db";
import * as Sentry from "@sentry/nextjs";

export class CurrencyUtils {
  public static readonly DEFAULT_CURRENCY_CODE = "uah";

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

  static normalizeCode(code: string | number | unknown): string {
    if (!code) return this.DEFAULT_CURRENCY_CODE;

    // Migration from legacy numeric codes (Monobank API style)
    const numCode = Number(code);
    if (!isNaN(numCode) && typeof code !== "boolean") {
      if (numCode === 840) return "usd";
      if (numCode === 980) return "uah";
      if (numCode === 978) return "eur";
      if (numCode === 985) return "pln";
      if (numCode === 826) return "gbp";
    }

    if (typeof code === "string") {
      return code.toLowerCase();
    }

    return String(code).toLowerCase();
  }

  static convert(
    amount: number,
    fromCode: string | number | unknown,
    toCode: string | number | unknown,
    rates: Record<string, number>,
  ): number {
    const from = this.normalizeCode(fromCode);
    const to = this.normalizeCode(toCode);

    if (from === to || amount === 0) return amount;

    // The API provides rates as: 1 baseCurrency = X targetCurrency
    // When we fetch with toCode as base, rates[fromCode] is: 1 toCode = X fromCode
    // So to convert fromCode to toCode: amount / rates[fromCode]
    const rate = rates[from];

    if (rate) {
      return amount / rate;
    }

    Sentry.captureException(
      `Exchange rate not found for conversion: ${from} -> ${to}`,
      {
        extra: { method: "CurrencyUtils.convert", from, to },
      },
    );

    return amount; // Fallback to original amount to avoid showing 0
  }
}
