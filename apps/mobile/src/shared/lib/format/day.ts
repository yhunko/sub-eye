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
 * Whether the day a picker value will be STORED as is still ahead.
 *
 * Guarding on the picker's own instant instead accepts a value that is already
 * past: `toIsoDay` moves a local day back to its UTC midnight, so west of UTC
 * the stored instant is up to one offset behind the one the guard inspected.
 * In UTC-7 after 17:00 that lets "pause until tomorrow" through and stores a
 * pause `deriveSubscriptionStatus` immediately reads as lapsed — the tap does
 * nothing, with no error. The same gap expires an intro offer on creation.
 */
export function isFutureDay(date: Date, now: Date = new Date()): boolean {
  return Date.parse(toIsoDay(date)) > now.getTime();
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
