import {
  CurrencyUtils,
  type SubscriptionHistoryDto,
  SubscriptionPeriod,
} from "shared";
import type {
  HistorySnapshot,
  RecurringAmount,
} from "./history-insights-types";

const VALID_PERIODS: SubscriptionPeriod[] = [
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getNumberValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const getStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const getBooleanValue = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const getPreferredBillingSnapshot = (
  snapshot: Record<string, unknown>,
): { cost?: number; currency?: string } => {
  const billingRaw = snapshot.billing;
  if (!isObject(billingRaw)) {
    return {};
  }

  const preferredRaw = billingRaw.preferred;
  if (!isObject(preferredRaw)) {
    return {};
  }

  return {
    cost: getNumberValue(preferredRaw.amount),
    currency: getStringValue(preferredRaw.currencyCode),
  };
};

const getScheduledPriceChangeSnapshot = (
  snapshot: Record<string, unknown>,
): {
  scheduledCost?: number;
  scheduledCurrency?: string;
  scheduledEffectiveAt?: string | null;
} => {
  const scheduledRaw = snapshot.scheduledPriceChange;

  if (scheduledRaw === null) {
    return { scheduledEffectiveAt: null };
  }

  if (!isObject(scheduledRaw)) {
    return {};
  }

  return {
    scheduledCost: getNumberValue(scheduledRaw.cost),
    scheduledCurrency: getStringValue(scheduledRaw.currency),
    scheduledEffectiveAt: getStringValue(scheduledRaw.effectiveAt),
  };
};

export const normalizeSnapshot = (snapshot: unknown): HistorySnapshot => {
  if (!isObject(snapshot)) {
    return {};
  }

  const everyRaw = getNumberValue(snapshot.every);
  const periodRaw = getStringValue(snapshot.period);
  const cancellationRaw = snapshot.willBeCancelledAt;
  const preferredBilling = getPreferredBillingSnapshot(snapshot);
  const scheduledPriceChange = getScheduledPriceChangeSnapshot(snapshot);
  const rawCost = getNumberValue(snapshot.cost);
  const rawCurrency = getStringValue(snapshot.currency);

  return {
    cost: preferredBilling.cost ?? rawCost,
    currency: preferredBilling.currency ?? rawCurrency,
    every:
      everyRaw !== undefined && Number.isInteger(everyRaw) && everyRaw > 0
        ? everyRaw
        : undefined,
    period:
      periodRaw && VALID_PERIODS.includes(periodRaw as SubscriptionPeriod)
        ? (periodRaw as SubscriptionPeriod)
        : undefined,
    paymentDate: getStringValue(snapshot.paymentDate),
    willBeCancelledAt:
      typeof cancellationRaw === "string" || cancellationRaw === null
        ? cancellationRaw
        : undefined,
    autoPaid: getBooleanValue(snapshot.autoPaid),
    scheduledCost: scheduledPriceChange.scheduledCost,
    scheduledCurrency: scheduledPriceChange.scheduledCurrency,
    scheduledEffectiveAt: scheduledPriceChange.scheduledEffectiveAt,
  };
};

export const getRecurringAmount = (
  snapshot: HistorySnapshot,
): RecurringAmount | null => {
  if (
    snapshot.cost === undefined ||
    snapshot.currency === undefined ||
    snapshot.every === undefined ||
    snapshot.period === undefined
  ) {
    return null;
  }

  const monthly = CurrencyUtils.toMonthly(
    snapshot.cost,
    snapshot.every,
    snapshot.period,
  );

  return {
    currency: snapshot.currency,
    monthly,
    yearly: monthly * 12,
  };
};

export const getRecordSnapshots = (
  record: SubscriptionHistoryDto,
  previousRecord: SubscriptionHistoryDto | undefined,
): {
  current: HistorySnapshot;
  previous: HistorySnapshot;
  hasPreviousState: boolean;
} => {
  const rawSnapshot = record.snapshot;

  if (isObject(rawSnapshot)) {
    const after = rawSnapshot.after;
    const before = rawSnapshot.before;

    if (after !== undefined || before !== undefined) {
      const hasPreviousState = before !== undefined && before !== null;

      return {
        current: normalizeSnapshot(after ?? rawSnapshot),
        previous: hasPreviousState
          ? normalizeSnapshot(before)
          : ({} as HistorySnapshot),
        hasPreviousState,
      };
    }
  }

  return {
    current: normalizeSnapshot(rawSnapshot),
    previous: previousRecord
      ? normalizeSnapshot(previousRecord.snapshot)
      : ({} as HistorySnapshot),
    hasPreviousState: previousRecord !== undefined,
  };
};
