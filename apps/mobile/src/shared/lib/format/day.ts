/**
 * The calendar day a date picker chose, as the UTC midnight this app stores.
 *
 * A picker answers with a LOCAL day carrying whatever time of day its value was
 * seeded with, but every stored date is read back formatted in UTC (`when.ts`)
 * and the reminder planner reads its `getUTC*` components. Serialising the
 * picker's instant directly therefore lands on the wrong UTC day for anyone
 * whose offset crosses midnight — in UTC-7 after 17:00 an untouched "today"
 * field already reads back as tomorrow, without the user touching the control.
 */
export function toIsoDay(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();
}

/**
 * Today, in the same encoding every stored date uses.
 *
 * The DEVICE's calendar day, not UTC's — the same choice the reminder planner
 * makes, and for the same reason: "has this day arrived" is a wall-clock
 * question and should be answered where the user physically is. Comparing a
 * stored day against a raw `Date.now()` instead answers it on UTC's clock,
 * which in Kyiv retires today's events at 03:00 and west of UTC retires them
 * during the previous evening.
 */
export function todayAsDay(now: Date = new Date()): number {
  return Date.parse(toIsoDay(now));
}

/**
 * Whether the day a picker value will be STORED as is still ahead.
 *
 * Both sides are days. Guarding on the picker's own instant instead accepts a
 * value that is already past: `toIsoDay` moves a local day back to its UTC
 * midnight, so west of UTC the stored instant is up to one offset behind the one
 * the guard inspected. In UTC-7 after 17:00 that let "pause until tomorrow"
 * through and stored a pause `deriveSubscriptionStatus` immediately read as
 * lapsed — the tap did nothing, with no error.
 */
export function isFutureDay(date: Date, now: Date = new Date()): boolean {
  return Date.parse(toIsoDay(date)) > todayAsDay(now);
}

/**
 * The inverse, for seeding a picker from a stored date. `new Date(iso)` is an
 * instant, so west of UTC it renders the field on the day BEFORE the one the
 * rest of the app shows — and saving an untouched form then moves the date.
 */
export function fromIsoDay(iso: string): Date {
  const stored = new Date(iso);
  return new Date(
    stored.getUTCFullYear(),
    stored.getUTCMonth(),
    stored.getUTCDate(),
  );
}

/**
 * The earliest day a picker may offer for something that has to be ahead of us.
 *
 * `isFutureDay` is a strict comparison of calendar days, so TODAY is not a
 * future date — a field seeded with it looks answered and fails on save. Used as
 * `minimumDate`, this makes that choice unreachable instead.
 */
export function tomorrow(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}
