import { SubscriptionPeriod } from "../types";
import { CurrenciesMap } from "../domains/currency/constants";

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

  static normalizeCode(code: string | undefined | null): string {
    if (!code) return this.DEFAULT_CURRENCY_CODE.toLowerCase();
    return code.trim().toLowerCase();
  }

  static convert(
    amount: number,
    fromCode: string,
    toCode: string,
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

  static formatAmount(
    amount: number,
    currencyCode: string | undefined | null,
    options?: {
      absolute?: boolean;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    },
  ): string {
    const normalized = this.normalizeCode(currencyCode);
    const currency = CurrenciesMap.get(normalized);
    const value = options?.absolute ? Math.abs(amount) : amount;
    const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
    const maximumFractionDigits = options?.maximumFractionDigits ?? 2;

    if (!currency) {
      return `${value.toFixed(maximumFractionDigits)} ${normalized.toUpperCase()}`;
    }

    const formatted = new Intl.NumberFormat(currency.format, {
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);

    return `${currency.symbol}${formatted}`;
  }

  static formatSignedAmount(amount: number, currencyCode: string): string {
    const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
    return `${sign}${this.formatAmount(Math.abs(amount), currencyCode)}`;
  }
}
