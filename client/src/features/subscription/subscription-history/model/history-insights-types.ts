import {
  FREE_SUBSCRIPTION_HISTORY_LIMIT,
  SubscriptionHistoryDto,
  SubscriptionPeriod,
} from "shared";

export const HISTORY_FREE_LIMIT = FREE_SUBSCRIPTION_HISTORY_LIMIT;

export type HistorySnapshot = {
  cost?: number;
  currency?: string;
  every?: number;
  period?: SubscriptionPeriod;
  paymentDate?: string;
  willBeCancelledAt?: string | null;
  autoPaid?: boolean;
  scheduledCost?: number;
  scheduledCurrency?: string;
  scheduledEffectiveAt?: string | null;
};

export type RecurringAmount = {
  currency: string;
  monthly: number;
  yearly: number;
};

export type BudgetImpactReason =
  | "mixedCurrency"
  | "missingData"
  | "missingPreviousState";

export type BudgetImpact = {
  currency?: string;
  monthlyDelta?: number;
  yearlyDelta?: number;
  comparable: boolean;
  reason?: BudgetImpactReason;
  deferredUntil?: string;
};

export type HistoryEventInsight = {
  record: SubscriptionHistoryDto;
  previousRecord?: SubscriptionHistoryDto;
  current: HistorySnapshot;
  previous: HistorySnapshot;
  impact: BudgetImpact;
  hasPreviousState: boolean;
};

export type HistoryInsights = {
  events: HistoryEventInsight[];
  totalEvents: number;
  currentRecurring: RecurringAmount | null;
  baselineRecurring: RecurringAmount | null;
  netImpact: BudgetImpact;
  latestImpact: BudgetImpact;
  strongestImpact: HistoryEventInsight | null;
  hasMixedCurrencies: boolean;
};
