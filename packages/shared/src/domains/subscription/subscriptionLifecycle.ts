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

type PhaseBoundaryLike = {
  startsAt: string;
  endsAt?: string | null;
};

/**
 * The phase whose window contains `now` — the one that determines the price
 * the user is currently paying. Pure and reusable on client and server.
 */
export const getEffectivePhase = <T extends PhaseBoundaryLike>(
  phases: readonly T[],
  now: Date = new Date(),
): T | null => {
  const target = now.getTime();
  let best: T | null = null;
  let bestStart = Number.NEGATIVE_INFINITY;

  for (const phase of phases) {
    const starts = Date.parse(phase.startsAt);
    if (Number.isNaN(starts) || starts > target) continue;

    const endsParsed = phase.endsAt ? Date.parse(phase.endsAt) : null;
    const ends =
      endsParsed === null || Number.isNaN(endsParsed) ? null : endsParsed;
    if (ends !== null && ends <= target) continue;

    if (starts > bestStart) {
      bestStart = starts;
      best = phase;
    }
  }

  return best;
};

/** The next phase that has not started yet (e.g. "trial ends → standard begins"). */
export const getUpcomingPhase = <T extends PhaseBoundaryLike>(
  phases: readonly T[],
  now: Date = new Date(),
): T | null => {
  const target = now.getTime();
  let best: T | null = null;
  let bestStart = Number.POSITIVE_INFINITY;

  for (const phase of phases) {
    const starts = Date.parse(phase.startsAt);
    if (Number.isNaN(starts) || starts <= target) continue;

    if (starts < bestStart) {
      bestStart = starts;
      best = phase;
    }
  }

  return best;
};
