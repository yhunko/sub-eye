/**
 * A subscription's pause window. `pausedAt` is when the user paused;
 * `resumeAt` is when it comes back (null = paused indefinitely).
 */
export type PauseWindow = {
  pausedAt?: string | null;
  resumeAt?: string | null;
};

/**
 * Is this projected charge date inside the pause window?
 *
 * The window is HALF-OPEN: `[pausedAt, resumeAt)`. An occurrence exactly on
 * `resumeAt` is charged — that is the "full amount in the resume month" rule.
 * Pause is evaluated per occurrence, never per subscription: a sub paused
 * January to March contributes 0 in January and February and its full amount
 * in March.
 */
export const isOccurrencePaused = (
  window: PauseWindow,
  occurrence: Date,
): boolean => {
  const pausedAt = window.pausedAt ? Date.parse(window.pausedAt) : Number.NaN;
  if (Number.isNaN(pausedAt)) return false;

  const at = occurrence.getTime();
  if (at < pausedAt) return false;

  const resumeAt = window.resumeAt ? Date.parse(window.resumeAt) : Number.NaN;
  if (Number.isNaN(resumeAt)) return true; // indefinite pause

  return at < resumeAt;
};
