import { DateTimezoneUtils } from "@subeye/time";
import type { SubscriptionStatus } from "./subscriptionStatus";

export const subscriptionLifecycleStatuses = [
  "active",
  "cancelledButActive",
  "cancelled",
] as const;

export type SubscriptionLifecycleStatus =
  (typeof subscriptionLifecycleStatuses)[number];

type LifecycleInput = {
  willBeCancelledAt?: string | null;
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getEffectiveCancellationDate = (input: LifecycleInput): Date | null => {
  const willBeCancelledAt = parseDate(input.willBeCancelledAt);

  if (!willBeCancelledAt) {
    return null;
  }

  return willBeCancelledAt;
};

/**
 * `willBeCancelledAt` is a calendar day, so "has it passed" is answered against
 * the account's current day — never a raw instant, which flips at 00:00 UTC.
 * See the note on `deriveSubscriptionStatus`, which this must agree with.
 */
export const getSubscriptionLifecycleStatus = (
  input: LifecycleInput,
  now: Date = new Date(),
  timezone?: string,
): SubscriptionLifecycleStatus => {
  const effectiveCancellation = getEffectiveCancellationDate(input);

  if (!effectiveCancellation) {
    return "active";
  }

  const today = DateTimezoneUtils.currentCalendarDay(now, timezone).getTime();

  if (effectiveCancellation.getTime() > today) {
    return "cancelledButActive";
  }

  return "cancelled";
};

/**
 * Is the subscription still billing right now? `cancelling` still is — it keeps
 * access until the paid period ends. `paused` is not: occurrences inside a
 * pause window contribute nothing to spend.
 */
export const isCurrentlyActiveSubscription = (
  status: SubscriptionStatus,
): boolean => status === "active" || status === "cancelling";

export const shouldIncludeOccurrence = (
  input: LifecycleInput,
  occurrence: Date,
): boolean => {
  const effectiveCancellation = getEffectiveCancellationDate(input);

  if (!effectiveCancellation) {
    return true;
  }

  return occurrence.getTime() < effectiveCancellation.getTime();
};
