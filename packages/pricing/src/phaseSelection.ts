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
