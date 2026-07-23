import type { SubscriptionDto } from "@subeye/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

// ponytail: average month/year lengths. This feeds a progress bar, never a
// charge, and it is only reached when the server has no `lastPaymentDate` to
// anchor the cycle to (a subscription that has not billed once yet).
const PERIOD_DAYS: Record<SubscriptionDto["period"], number> = {
  day: 1,
  week: 7,
  month: 30.44,
  year: 365.25,
};

export type CycleInput = Pick<
  SubscriptionDto,
  "every" | "period" | "lastPaymentDate" | "nextPaymentDate"
>;

/**
 * How far through the current billing cycle we are, 0–1.
 *
 * The cycle runs from the last charge to the next one, so a monthly and a yearly
 * subscription both read as "nearly due" at the same bar width. Clamped at both
 * ends: `nextPaymentDate` can sit in the past between a due date and the next
 * read that settles it.
 */
export function cycleProgress(
  subscription: CycleInput,
  now: number = Date.now(),
): number {
  const end = Date.parse(subscription.nextPaymentDate);
  if (Number.isNaN(end)) return 0;

  const last = subscription.lastPaymentDate
    ? Date.parse(subscription.lastPaymentDate)
    : Number.NaN;
  const start = Number.isNaN(last)
    ? end - PERIOD_DAYS[subscription.period] * subscription.every * DAY_MS
    : last;

  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}
