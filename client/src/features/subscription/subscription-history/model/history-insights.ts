import type { SubscriptionHistoryDto } from "shared";
import {
  getImpactWeight,
  isPriceChangeEvent,
  resolveHistoryImpact,
  resolveNetImpact,
  unknownImpact,
} from "./history-insights-impact";
import {
  getRecordSnapshots,
  getRecurringAmount,
} from "./history-insights-snapshot";
import type { HistoryInsights } from "./history-insights-types";

export {
  getRecurringAmount,
  normalizeSnapshot,
} from "./history-insights-snapshot";
export {
  type BudgetImpact,
  type BudgetImpactReason,
  HISTORY_FREE_LIMIT,
  type HistoryEventInsight,
  type HistoryInsights,
  type HistorySnapshot,
  type RecurringAmount,
} from "./history-insights-types";
export { isPriceChangeEvent };

export const buildHistoryInsights = (
  history: SubscriptionHistoryDto[],
): HistoryInsights => {
  const events = history.map((record, index) => {
    const previousRecord = history[index + 1];
    const { current, previous, hasPreviousState } = getRecordSnapshots(
      record,
      previousRecord,
    );

    return {
      record,
      previousRecord,
      current,
      previous,
      hasPreviousState,
      impact: resolveHistoryImpact(
        record.action,
        current,
        previous,
        hasPreviousState,
      ),
    };
  });

  const currentRecurring = events[0]
    ? getRecurringAmount(events[0].current)
    : null;
  const oldestEvent = events[events.length - 1];
  const baselineSnapshot = oldestEvent?.hasPreviousState
    ? oldestEvent.previous
    : oldestEvent?.record.action === "created"
      ? oldestEvent.current
      : null;
  const baselineRecurring = baselineSnapshot
    ? getRecurringAmount(baselineSnapshot)
    : null;

  const netImpact = resolveNetImpact(currentRecurring, baselineRecurring);
  const latestImpact = events[0]?.impact ?? unknownImpact("missingData");

  const strongestImpact =
    [...events]
      .filter((event) => getImpactWeight(event.impact) > 0)
      .sort((left, right) => {
        return getImpactWeight(right.impact) - getImpactWeight(left.impact);
      })[0] ?? null;

  return {
    events,
    totalEvents: history.length,
    currentRecurring,
    baselineRecurring,
    netImpact,
    latestImpact,
    strongestImpact,
    hasMixedCurrencies:
      events.some((event) => event.impact.reason === "mixedCurrency") ||
      netImpact.reason === "mixedCurrency",
  };
};
