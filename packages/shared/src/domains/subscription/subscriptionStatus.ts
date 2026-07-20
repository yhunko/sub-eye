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
 * Used in two places: as the source of truth for the one-off backfill that
 * populates `subscriptions.status` (the SQL in `0000_v4_baseline.sql` must agree
 * with this function), and as the reference implementation the pause/cancel
 * services write through.
 *
 * Precedence: cancellation outranks pause. A subscription that is both paused
 * and cancelled is cancelled — the pause is irrelevant once billing has stopped.
 */
export const deriveSubscriptionStatus = (
  input: StatusInput,
  now: Date = new Date(),
): SubscriptionStatus => {
  const target = now.getTime();
  const cancelAt = toTime(input.willBeCancelledAt);

  if (cancelAt !== null) {
    return cancelAt > target ? "cancelling" : "cancelled";
  }

  const pausedAt = toTime(input.pausedAt);

  if (pausedAt === null || pausedAt > target) {
    return "active";
  }

  const resumeAt = toTime(input.resumeAt);

  // An open-ended pause (no resume date) stays paused until it is resumed
  // explicitly. A pause whose resume date has passed has lapsed on its own.
  if (resumeAt !== null && resumeAt <= target) {
    return "active";
  }

  return "paused";
};
