import {
  CurrencyUtils,
  SubscriptionHistoryDto,
  SubscriptionPeriod,
} from "shared";
import { HistorySnapshot, RecurringAmount } from "./history-insights-types";

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

export const normalizeSnapshot = (snapshot: unknown): HistorySnapshot => {
  if (!isObject(snapshot)) {
    return {};
  }

  const everyRaw = getNumberValue(snapshot.every);
  const periodRaw = getStringValue(snapshot.period);
  const cancellationRaw = snapshot.willBeCancelledAt;

  return {
    cost: getNumberValue(snapshot.cost),
    currency: getStringValue(snapshot.currency),
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
