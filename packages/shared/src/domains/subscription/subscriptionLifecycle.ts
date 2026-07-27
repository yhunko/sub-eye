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

export const getSubscriptionLifecycleStatus = (
  input: LifecycleInput,
  now: Date = new Date(),
): SubscriptionLifecycleStatus => {
  const effectiveCancellation = getEffectiveCancellationDate(input);

  if (!effectiveCancellation) {
    return "active";
  }

  if (effectiveCancellation.getTime() > now.getTime()) {
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
