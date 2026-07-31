/**
 * A barrier that lets a reader wait until no writer is mid-flight.
 *
 * Exists because rebuilding the schedule is destructive-then-constructive:
 * `syncReminders` cancels every pending notification and only then schedules
 * the new set, one awaited native call at a time. Anything that samples the
 * OS's pending list during that window sees ZERO — over a schedule that is
 * about to exist — and the status section reports "nothing scheduled" on a
 * perfectly healthy install. Two syncs racing on foreground makes that window
 * easy to hit, because the losing run's completion callback fires while the
 * winning run is still writing.
 *
 * Pure promise plumbing, no platform types, so the tricky part is testable.
 */
export type SettleBarrier = {
  /** Register a writer. Returns the same promise, so callers can still await it. */
  track: <T>(work: Promise<T>) => Promise<T>;
  /** Resolves once no tracked writer is in flight. */
  settled: () => Promise<void>;
};

export function createSettleBarrier(): SettleBarrier {
  let current: Promise<unknown> = Promise.resolve();

  return {
    track: (work) => {
      // Swallow rejections on the BARRIER only — the caller still gets the real
      // promise, so a failing sync reports its own error and does not wedge
      // every future reader on an unhandled rejection.
      current = work.catch(() => undefined);
      return work;
    },

    settled: async () => {
      // Loop, don't just await once: a writer can start while we are awaiting
      // the previous one, and returning then would sample the new rebuild's
      // cancel-all window — the exact thing this exists to prevent. Terminates
      // as soon as two consecutive checks see the same writer.
      let awaited: Promise<unknown> | null = null;
      while (awaited !== current) {
        awaited = current;
        await awaited;
      }
    },
  };
}
