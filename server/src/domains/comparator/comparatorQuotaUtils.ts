import { format } from "date-fns";
import {
  DateTimezoneUtils,
  FREE_COMPARATOR_AI_MONTHLY_LIMIT,
  FREE_COMPARATOR_MONTHLY_LIMIT,
  PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
  type ComparatorAiQuotaDto,
  type ComparatorQuotaDto,
  type PlanId,
} from "shared";

export type QuotaWindow = {
  periodKey: string;
  resetsAt: string;
};

export const getComparatorQuotaWindow = (timezone?: string): QuotaWindow => {
  const now = DateTimezoneUtils.now(timezone);
  const periodStart = DateTimezoneUtils.startOfMonth(now, timezone);
  const nextPeriodStart = DateTimezoneUtils.startOfMonth(
    DateTimezoneUtils.shiftMonths(periodStart, 1, timezone),
    timezone,
  );

  return {
    periodKey: format(periodStart, "yyyy-MM"),
    resetsAt: nextPeriodStart.toISOString(),
  };
};

export const toComparatorQuotaDto = (
  planId: PlanId,
  used: number,
  quotaWindow: QuotaWindow,
): ComparatorQuotaDto => {
  if (planId === "plus") {
    return {
      planId,
      periodKey: quotaWindow.periodKey,
      resetsAt: quotaWindow.resetsAt,
      used,
      limit: null,
      remaining: null,
      isLimited: false,
    };
  }

  const remaining = Math.max(FREE_COMPARATOR_MONTHLY_LIMIT - used, 0);

  return {
    planId,
    periodKey: quotaWindow.periodKey,
    resetsAt: quotaWindow.resetsAt,
    used,
    limit: FREE_COMPARATOR_MONTHLY_LIMIT,
    remaining,
    isLimited: true,
  };
};

export const getComparatorAiLimit = (planId: PlanId): number =>
  planId === "plus"
    ? PLUS_COMPARATOR_AI_MONTHLY_LIMIT
    : FREE_COMPARATOR_AI_MONTHLY_LIMIT;

export const toComparatorAiQuotaDto = (
  planId: PlanId,
  used: number,
  quotaWindow: QuotaWindow,
): ComparatorAiQuotaDto => {
  const limit = getComparatorAiLimit(planId);
  const remaining = Math.max(limit - used, 0);

  return {
    planId,
    periodKey: quotaWindow.periodKey,
    resetsAt: quotaWindow.resetsAt,
    used,
    limit,
    remaining,
    isLimited: true,
  };
};
