import type { SubscriptionPeriod } from "@subeye/model";
import { DateTimezoneUtils, RecurrenceUtils } from "@subeye/time";
import { deriveSubscriptionStatus } from "./status";

export type TransitionInput = {
  paymentDate: string;
  every: number;
  period: SubscriptionPeriod;
  willBeCancelledAt: string | null;
  pausedAt: string | null;
  resumeAt: string | null;
};

export type TransitionPatch = Partial<
  Pick<
    TransitionInput,
    "paymentDate" | "willBeCancelledAt" | "pausedAt" | "resumeAt"
  >
>;

/**
 * Through `new Date` first: a `TZDate`'s own `toISOString()` emits the offset
 * form (`…+00:00`), and these strings are compared and sliced as plain UTC
 * instants by both clients. Every date leaving this module goes through here.
 */
const iso = (day: Date): string => new Date(day.getTime()).toISOString();

/**
 * The next occurrence at or after the account's current calendar day.
 *
 * Reaches `RecurrenceUtils` directly rather than
 * `SubscriptionCalculator.calculatePaymentDates`, which computes the same
 * thing: `@subeye/spend` depends on this package, so calling into it here
 * would be a cycle.
 */
const nextOccurrence = (
  sub: TransitionInput,
  now: Date,
  timezone?: string,
): Date =>
  RecurrenceUtils.getNextOccurrence(
    DateTimezoneUtils.toCalendarDay(sub.paymentDate),
    sub.every,
    sub.period,
    DateTimezoneUtils.currentCalendarDay(now, timezone),
  );

/**
 * Cancelling writes the cancellation column and nothing else — a pause is left
 * in place deliberately, because `renew` is what clears it and a cancelled
 * subscription is offered `renew`, not `resume`.
 */
export const cancel = (
  sub: TransitionInput,
  mode: "periodEnd" | "immediate",
  now: Date,
  timezone?: string,
): TransitionPatch => ({
  // The user's calendar DAY, not the instant. `willBeCancelledAt` is a day
  // value everywhere else, and west of UTC a raw instant lands on tomorrow's
  // UTC day — an evening "cancel now" then read as still cancelling until the
  // following morning.
  willBeCancelledAt:
    mode === "immediate"
      ? iso(DateTimezoneUtils.currentCalendarDay(now, timezone))
      : iso(nextOccurrence(sub, now, timezone)),
});

/**
 * Renew clears the cancellation AND the pause. A paused subscription is offered
 * `cancel` and a cancelled one is offered `renew`, so the pause columns outlive
 * the cancellation they were buried under; left in place they return the
 * restarted subscription to an indefinite pause, which drops every future
 * occurrence from spend while the badge reads active.
 */
export const renew = (
  _sub: TransitionInput,
  paymentDate: string | null,
  _now: Date,
): TransitionPatch => ({
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  // Spread, not a null assignment: a renew with no date must leave the anchor
  // untouched. A `cancelling` subscription never stopped billing, so moving its
  // anchor would shift a cycle that was never interrupted.
  //
  // Stored as the caller sent it. The client floors it with `toIsoDay` and the
  // valibot schema validates it as a past ISO date; flooring again here would
  // be a behaviour change, not a port.
  ...(paymentDate ? { paymentDate } : {}),
});

export const pause = (
  sub: TransitionInput,
  resumeAt: string | null,
  now: Date,
  timezone?: string,
): TransitionPatch | null => {
  // The guard is "already paused" — NOT "not active": a `cancelling`
  // subscription can be paused here. `getAllowedActions` never offers it, so no
  // UI reaches that case, but the rule is preserved as it stands rather than
  // tightened inside a move. Derived, never the stored column: nothing rewrites
  // the column when `resumeAt` simply elapses, so a lapsed pause would be stuck
  // unpausable forever.
  if (deriveSubscriptionStatus(sub, now, timezone) === "paused") return null;

  return {
    // An INSTANT, deliberately. Floored to its day it would read as "paused
    // since midnight", and a charge actually taken that morning would drop out
    // of spend — a pause silently rewriting money already spent.
    pausedAt: now.toISOString(),
    resumeAt: resumeAt ?? null,
  };
};

export const resume = (
  sub: TransitionInput,
  now: Date,
  timezone?: string,
): TransitionPatch | null => {
  if (deriveSubscriptionStatus(sub, now, timezone) !== "paused") return null;

  return {
    // Roll the anchor past the pause window, or the next payment date still
    // points at a charge that never happened.
    paymentDate: iso(nextOccurrence(sub, now, timezone)),
    pausedAt: null,
    resumeAt: null,
  };
};
