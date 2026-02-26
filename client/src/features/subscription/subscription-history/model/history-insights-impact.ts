import { SubscriptionAction } from "shared";
import {
  BudgetImpact,
  BudgetImpactReason,
  HistoryEventInsight,
  HistorySnapshot,
  RecurringAmount,
} from "./history-insights-types";
import { getRecurringAmount } from "./history-insights-snapshot";

const toImpactFromDelta = (
  monthlyDelta: number,
  currency: string,
  deferredUntil?: string,
): BudgetImpact => ({
  currency,
  monthlyDelta,
  yearlyDelta: monthlyDelta * 12,
  comparable: true,
  deferredUntil,
});

export const unknownImpact = (reason: BudgetImpactReason): BudgetImpact => ({
  comparable: false,
  reason,
});

const resolveUpdatedImpact = (
  currentRecurring: RecurringAmount | null,
  previousRecurring: RecurringAmount | null,
  hasPreviousState: boolean,
): BudgetImpact => {
  if (!hasPreviousState) {
    return unknownImpact("missingPreviousState");
  }

  if (!currentRecurring || !previousRecurring) {
    return unknownImpact("missingData");
  }

  if (currentRecurring.currency !== previousRecurring.currency) {
    return unknownImpact("mixedCurrency");
  }

  return toImpactFromDelta(
    currentRecurring.monthly - previousRecurring.monthly,
    currentRecurring.currency,
  );
};

export const resolveHistoryImpact = (
  action: SubscriptionAction,
  current: HistorySnapshot,
  previous: HistorySnapshot,
  hasPreviousState: boolean,
): BudgetImpact => {
  const currentRecurring = getRecurringAmount(current);
  const previousRecurring = getRecurringAmount(previous);

  switch (action) {
    case "created": {
      if (!currentRecurring) {
        return unknownImpact("missingData");
      }

      return toImpactFromDelta(
        currentRecurring.monthly,
        currentRecurring.currency,
      );
    }
    case "deleted": {
      if (!currentRecurring) {
        return unknownImpact("missingData");
      }

      return toImpactFromDelta(
        -currentRecurring.monthly,
        currentRecurring.currency,
      );
    }
    case "updated":
      return resolveUpdatedImpact(
        currentRecurring,
        previousRecurring,
        hasPreviousState,
      );
    case "cancelled": {
      if (!currentRecurring || !current.willBeCancelledAt) {
        return unknownImpact("missingData");
      }

      return toImpactFromDelta(
        -currentRecurring.monthly,
        currentRecurring.currency,
        current.willBeCancelledAt,
      );
    }
    case "uncancelled": {
      if (!currentRecurring || !previous.willBeCancelledAt) {
        return unknownImpact("missingData");
      }

      return toImpactFromDelta(
        currentRecurring.monthly,
        currentRecurring.currency,
        previous.willBeCancelledAt,
      );
    }
    case "renewed":
      return {
        currency: currentRecurring?.currency,
        monthlyDelta: 0,
        yearlyDelta: 0,
        comparable: true,
      };
    default:
      return unknownImpact("missingData");
  }
};

export const resolveNetImpact = (
  latest: RecurringAmount | null,
  baseline: RecurringAmount | null,
): BudgetImpact => {
  if (!latest || !baseline) {
    return unknownImpact("missingData");
  }

  if (latest.currency !== baseline.currency) {
    return unknownImpact("mixedCurrency");
  }

  return toImpactFromDelta(latest.monthly - baseline.monthly, latest.currency);
};

export const getImpactWeight = (impact: BudgetImpact): number => {
  if (!impact.comparable || impact.monthlyDelta === undefined) {
    return -1;
  }

  return Math.abs(impact.monthlyDelta);
};

export const isPriceChangeEvent = (event: HistoryEventInsight): boolean => {
  if (event.record.action !== "updated" || !event.hasPreviousState) {
    return false;
  }

  const currentCost = event.current.cost;
  const previousCost = event.previous.cost;
  const currentCurrency = event.current.currency;
  const previousCurrency = event.previous.currency;

  if (
    currentCost === undefined ||
    previousCost === undefined ||
    !currentCurrency ||
    !previousCurrency
  ) {
    return false;
  }

  return currentCost !== previousCost || currentCurrency !== previousCurrency;
};
