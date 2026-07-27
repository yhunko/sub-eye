/**
 * The minimum shape of a pricing phase for boundary comparison. `endsAt` of
 * `null`/`undefined` means the phase is open-ended (the standard price).
 */
export type PhaseBoundaryLike = {
  startsAt: string;
  endsAt?: string | null;
};

/**
 * The phase whose window contains `now` — the one that determines the price
 * the user is currently paying. Pure and reusable on client and server.
 *
 * Boundaries are half-open `[startsAt, endsAt)`: a phase ending at exactly
 * `now` is already over, and the next phase starting at exactly `now` has
 * begun. This is what stops two phases claiming the same instant.
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

/**
 * The pending phases whose boundary has already arrived, oldest first.
 *
 * "Pending" means `appliedAt` is null — the idempotency anchor. Ordering is
 * load-bearing: each apply overwrites the subscription's cost, so applying out
 * of order leaves the row holding a price from the middle of the timeline.
 */
export const selectDuePhases = <
  T extends PhaseBoundaryLike & { appliedAt?: string | null },
>(
  phases: readonly T[],
  nowMs: number,
): T[] =>
  phases
    .filter((phase) => !phase.appliedAt && Date.parse(phase.startsAt) <= nowMs)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
