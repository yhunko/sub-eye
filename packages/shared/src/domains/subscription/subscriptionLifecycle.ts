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

export const getEffectiveCancellationDate = (
  input: LifecycleInput,
): Date | null => {
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

export const isCurrentlyActiveSubscription = (
  status: SubscriptionLifecycleStatus,
): boolean => status === "active" || status === "cancelledButActive";

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
