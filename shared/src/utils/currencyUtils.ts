import { SubscriptionPeriod } from "../types";

export class CurrencyUtils {
  public static readonly DEFAULT_CURRENCY_CODE = "uah";

  /**
   * Calculates the monthly cost based on the amount, interval, and period.
   */
  static toMonthly(
    amount: number,
    every: number,
    period: SubscriptionPeriod,
  ): number {
    const interval = Math.max(1, every);
    const safeAmount = Math.max(0, amount);

    switch (period) {
      case SubscriptionPeriod.DAY:
        return (safeAmount * 30.4375) / interval;
      case SubscriptionPeriod.WEEK:
        return (safeAmount * 4.345) / interval;
      case SubscriptionPeriod.MONTH:
        return safeAmount / interval;
      case SubscriptionPeriod.YEAR:
        return safeAmount / 12 / interval;
      default:
        return safeAmount;
    }
  }

  static normalizeCode(code: string | number | unknown): string {
    if (!code) return this.DEFAULT_CURRENCY_CODE;

    const numCode = Number(code);
    if (!Number.isNaN(numCode) && typeof code !== "boolean") {
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

    const rate = rates[from];

    if (rate) {
      return amount / rate;
    }

    return amount;
  }
}
