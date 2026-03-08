import { CurrencyUtils, SubscriptionAction } from "shared";
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
  current: HistorySnapshot,
  previous: HistorySnapshot,
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

  if (currentRecurring.currency === previousRecurring.currency) {
    const immediateImpact = toImpactFromDelta(
      currentRecurring.monthly - previousRecurring.monthly,
      currentRecurring.currency,
    );

    if (Math.abs(immediateImpact.monthlyDelta ?? 0) > 0.0001) {
      return immediateImpact;
    }
  } else {
    return unknownImpact("mixedCurrency");
  }

  const scheduleWasKnown =
    current.scheduledEffectiveAt !== undefined ||
    previous.scheduledEffectiveAt !== undefined;
  const scheduleChanged =
    scheduleWasKnown &&
    (current.scheduledCost !== previous.scheduledCost ||
      current.scheduledCurrency !== previous.scheduledCurrency ||
      current.scheduledEffectiveAt !== previous.scheduledEffectiveAt);

  if (!scheduleChanged) {
    return toImpactFromDelta(0, currentRecurring.currency);
  }

  const currentBaseCycle = current.every ?? previous.every;
  const currentBasePeriod = current.period ?? previous.period;

  if (!currentBaseCycle || !currentBasePeriod) {
    return unknownImpact("missingData");
  }

  if (current.scheduledEffectiveAt) {
    if (
      current.scheduledCost === undefined ||
      !current.scheduledCurrency ||
      current.scheduledCurrency !== currentRecurring.currency
    ) {
      return unknownImpact(
        current.scheduledCurrency &&
          current.scheduledCurrency !== currentRecurring.currency
          ? "mixedCurrency"
          : "missingData",
      );
    }

    const scheduledMonthly = CurrencyUtils.toMonthly(
      current.scheduledCost,
      currentBaseCycle,
      currentBasePeriod,
    );

    return toImpactFromDelta(
      scheduledMonthly - currentRecurring.monthly,
      currentRecurring.currency,
      current.scheduledEffectiveAt,
    );
  }

  if (
    previous.scheduledEffectiveAt &&
    previous.scheduledCost !== undefined &&
    previous.scheduledCurrency
  ) {
    if (previous.scheduledCurrency !== currentRecurring.currency) {
      return unknownImpact("mixedCurrency");
    }

    const scheduledMonthly = CurrencyUtils.toMonthly(
      previous.scheduledCost,
      currentBaseCycle,
      currentBasePeriod,
    );

    return toImpactFromDelta(
      currentRecurring.monthly - scheduledMonthly,
      currentRecurring.currency,
      previous.scheduledEffectiveAt,
    );
  }

  return toImpactFromDelta(0, currentRecurring.currency);
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
        current,
        previous,
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

  const immediateChange =
    currentCost === undefined ||
    previousCost === undefined ||
    !currentCurrency ||
    !previousCurrency
      ? false
      : currentCost !== previousCost || currentCurrency !== previousCurrency;

  if (immediateChange) {
    return true;
  }

  const scheduleKnown =
    event.current.scheduledEffectiveAt !== undefined ||
    event.previous.scheduledEffectiveAt !== undefined;

  if (!scheduleKnown) {
    return false;
  }

  return (
    event.current.scheduledCost !== event.previous.scheduledCost ||
    event.current.scheduledCurrency !== event.previous.scheduledCurrency ||
    event.current.scheduledEffectiveAt !== event.previous.scheduledEffectiveAt
  );
};
