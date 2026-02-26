import * as m from "@/i18n/messages";
import { type Locale } from "date-fns";
import { BudgetImpact } from "../../model/history-insights";
import {
  formatAmount,
  formatHistoryDateLabel,
} from "./subscription-history-formatters";

export const formatHistoryImpactTone = (impact: BudgetImpact): string => {
  if (!impact.comparable || impact.monthlyDelta === undefined) {
    return "text-muted-foreground";
  }

  if (Math.abs(impact.monthlyDelta) < 0.0001) {
    return "text-muted-foreground";
  }

  return impact.monthlyDelta > 0 ? "text-rose-600" : "text-emerald-600";
};

export const formatHistoryImpactLabel = (
  impact: BudgetImpact,
  locale: Locale,
): string => {
  if (!impact.comparable) {
    if (impact.reason === "mixedCurrency") {
      return m.subscription_history_impact_mixedCurrency();
    }

    if (impact.reason === "missingPreviousState") {
      return m.subscription_history_impact_noPreviousState();
    }

    return m.subscription_history_impact_missingData();
  }

  if (!impact.currency || impact.monthlyDelta === undefined) {
    return m.subscription_history_impact_missingData();
  }

  if (Math.abs(impact.monthlyDelta) < 0.0001) {
    return m.subscription_history_impact_noChange();
  }

  const sign = impact.monthlyDelta > 0 ? "+" : "-";
  const monthly = `${sign}${formatAmount(Math.abs(impact.monthlyDelta), impact.currency)}${m.common_perMonth()}`;

  if (!impact.deferredUntil) {
    return monthly;
  }

  return `${monthly} · ${m.subscription_history_impact_startsAfter({
    date:
      formatHistoryDateLabel(impact.deferredUntil, locale) ??
      m.subscription_history_unknownDate(),
  })}`;
};

export const areBudgetImpactsEqual = (
  left: BudgetImpact,
  right: BudgetImpact,
): boolean => {
  return (
    left.comparable === right.comparable &&
    left.reason === right.reason &&
    left.currency === right.currency &&
    left.monthlyDelta === right.monthlyDelta &&
    left.yearlyDelta === right.yearlyDelta &&
    left.deferredUntil === right.deferredUntil
  );
};
