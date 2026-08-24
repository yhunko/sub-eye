import { DateTimezoneUtils } from "@subeye/time";

/**
 * The persisted lifecycle status of a subscription.
 *
 * Before v4 this was derived on every read from the single nullable column
 * `subscriptions.cancelled_at` (see `subscriptionLifecycle.ts`), which meant it
 * could not be filtered in SQL and could not express "paused until 15 March".
 * The order below is the order of the `subscription_status` pgEnum — do not
 * reorder it without a migration.
 *
 * - `active`     — billing normally
 * - `paused`     — temporarily suspended; occurrences inside the pause window
 *                  contribute nothing to spend
 * - `cancelling` — cancelled but still inside the paid period (this is the value
 *                  the old derived code spelled `cancelledButActive`)
 * - `cancelled`  — the paid period has elapsed
 */
export const subscriptionStatuses = [
  "active",
  "paused",
  "cancelling",
  "cancelled",
] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

type StatusInput = {
  willBeCancelledAt?: string | null;
  pausedAt?: string | null;
  resumeAt?: string | null;
};

const toTime = (value?: string | null): number | null => {
  if (!value) return null;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * The status a subscription *should* have right now, given its date columns.
 *
 * The reference implementation the pause/cancel services write through. (It was
 * also the spec for the one-off `status` backfill in `0000_v4_baseline.sql`;
 * that SQL compares against `now() at time zone 'utc'` and no longer matches
 * this function at a day boundary. The backfill has run on every branch and is
 * baseline-only — treat the SQL as history, not as a second implementation to
 * keep in step.)
 *
 * Precedence: cancellation outranks pause. A subscription that is both paused
 * and cancelled is cancelled — the pause is irrelevant once billing has stopped.
 *
 * TWO KINDS OF VALUE ARE COMPARED HERE, and mixing them up is the whole reason
 * this function takes a `timezone`:
 *
 * - `willBeCancelledAt` and `resumeAt` are CALENDAR DAYS. "Has that day arrived
 *   for this user" is a day-versus-day question, so both are compared against
 *   the account's current calendar day. Against a raw instant they flip at
 *   00:00 UTC instead: three hours late in Kyiv, and — far worse — during the
 *   *evening before* for anyone west of UTC, who would watch a subscription
 *   read "Ended" on a day they still had access.
 * - `pausedAt` is an INSTANT: the moment the user tapped pause. It must stay
 *   one. Floored to its day it would read as "paused since midnight", and
 *   `isOccurrencePaused` would then exclude a charge that was actually taken
 *   that morning — a pause silently rewriting money already spent.
 */
export const deriveSubscriptionStatus = (
  input: StatusInput,
  now: Date = new Date(),
  timezone?: string,
): SubscriptionStatus => {
  const today = DateTimezoneUtils.currentCalendarDay(now, timezone).getTime();
  const cancelAt = toTime(input.willBeCancelledAt);

  if (cancelAt !== null) {
    // Floored to its own day before comparing. An IMMEDIATE cancellation is the
    // one writer that has a time of day to lose — "access ends now" — and left
    // unfloored it reads as `cancelling` for the rest of that day, which is a
    // subscription the user just killed still advertising itself as live.
    const cancelDay = DateTimezoneUtils.currentCalendarDay(
      new Date(cancelAt),
      "UTC",
    ).getTime();
    return cancelDay > today ? "cancelling" : "cancelled";
  }

  const pausedAt = toTime(input.pausedAt);

  if (pausedAt === null || pausedAt > now.getTime()) {
    return "active";
  }

  const resumeAt = toTime(input.resumeAt);

  // An open-ended pause (no resume date) stays paused until it is resumed
  // explicitly. A pause whose resume day has arrived has lapsed on its own.
  if (resumeAt !== null && resumeAt <= today) {
    return "active";
  }

  return "paused";
};

export const subscriptionAllowedActions = [
  "edit",
  "pause",
  "resume",
  "cancel",
  "renew",
  "delete",
  "addPhase",
  "applyPhaseNow",
  "cancelPhase",
] as const;

export type SubscriptionAllowedAction =
  (typeof subscriptionAllowedActions)[number];

/**
 * The single source of truth for which lifecycle actions are legal. Returned
 * on every SubscriptionDto so the client renders affordances instead of
 * re-deriving the rules and getting them subtly wrong.
 *
 * Order is stable and meaningful: the client renders them in this order.
 */
export const getAllowedActions = (input: {
  status: SubscriptionStatus;
  hasPendingPhase: boolean;
}): SubscriptionAllowedAction[] => {
  switch (input.status) {
    case "active": {
      const actions: SubscriptionAllowedAction[] = ["edit", "addPhase"];
      if (input.hasPendingPhase) actions.push("applyPhaseNow", "cancelPhase");
      actions.push("pause", "cancel", "delete");
      return actions;
    }
    // A paused sub has no live billing to schedule a price change against.
    case "paused":
      return ["edit", "resume", "cancel", "delete"];
    // Cancellation is pending: un-cancel is the meaningful move, not pause.
    case "cancelling":
      return ["edit", "renew", "delete"];
    case "cancelled":
      return ["renew", "delete"];
  }
};
