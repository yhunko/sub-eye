import {
  CurrenciesMap,
  CurrencyUtils,
  type SubscriptionPeriod,
} from "@subeye/shared";
import {
  format,
  formatDistanceToNowStrict,
  isValid,
  type Locale,
} from "date-fns";
import { formatSubscriptionCycle } from "@/entities/subscription";
import * as m from "@/i18n/messages";

export const formatAmount = (amount: number, code: string): string => {
  const normalizedCode = CurrencyUtils.normalizeCode(code);
  const metadata = CurrenciesMap.get(normalizedCode);

  if (metadata) {
    const formattedAmount = new Intl.NumberFormat(metadata.format, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${metadata.symbol}${formattedAmount}`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalizedCode.toUpperCase()}`;
  }
};

export const parseHistoryDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return isValid(parsed) ? parsed : null;
};

export const formatHistoryDateLabel = (
  value: string | null | undefined,
  locale: Locale,
): string | null => {
  const parsed = parseHistoryDate(value);
  if (!parsed) {
    return null;
  }

  return format(parsed, "d MMM yyyy, HH:mm", { locale });
};

export const formatHistoryRelativeTime = (
  value: string,
  locale: Locale,
): string => {
  const parsed = parseHistoryDate(value);

  if (!parsed) {
    return m.subscription_history_unknownDate();
  }

  if (Math.abs(Date.now() - parsed.getTime()) < 60_000) {
    return m.subscription_history_justNow();
  }

  return formatDistanceToNowStrict(parsed, { addSuffix: true, locale });
};

export const formatHistoryCycle = (
  every: number | undefined,
  period: SubscriptionPeriod | undefined,
): string | null => {
  return formatSubscriptionCycle(every, period);
};
