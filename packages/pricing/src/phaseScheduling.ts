import type {
  ScheduledPriceChangeMode,
  SubscriptionPeriod,
} from "@subeye/model";
import { DateTimezoneUtils, RecurrenceUtils } from "@subeye/time";

/** How the user asked for the new price to take effect. */
export type ScheduleEffectiveAtRequest = {
  mode: ScheduledPriceChangeMode;
  customDate?: string | null;
};

/** The minimum shape needed to walk a subscription's recurrence. */
export type PhaseSubject = {
  every: number;
  period: SubscriptionPeriod;
  paymentDate: string | Date;
};

/**
 * Floors a phase boundary to the UTC midnight of its calendar day.
 *
 * UTC, not the account's timezone. A boundary is a calendar DAY — the client
 * picks "1 September" and reads it back with `timeZone: "UTC"` — so flooring in
 * Europe/Kyiv stored `2026-08-31T21:00Z` and the app then printed the trial as
 * ending on 31 August. See `DateTimezoneUtils.toCalendarDay`.
 */
export const toStartOfUtcDay = (date: string): string =>
  DateTimezoneUtils.currentCalendarDay(date, "UTC").toISOString();

export const isSameUtcDay = (
  left: string | Date,
  right: string | Date,
): boolean =>
  DateTimezoneUtils.isSameCalendarDay(new Date(left), new Date(right));

/**
 * The instant of the subscription's next renewal.
 *
 * `getNextOccurrence` returns today's renewal if one falls today, so if that
 * instant is already past we step forward one full period — a price change must
 * never be scheduled in the past.
 */
const resolveNextOccurrenceEffectiveAt = (
  subscription: PhaseSubject,
  now: Date,
  timezone?: string,
): string => {
  // Through `new Date` first: `toCalendarDay` hands back a `TZDate`, whose own
  // `toISOString()` emits the offset form (`…+00:00`), and both clients slice
  // and compare these strings as plain `Z` instants.
  const nextPaymentDate = new Date(
    RecurrenceUtils.getNextOccurrence(
      DateTimezoneUtils.toCalendarDay(subscription.paymentDate),
      subscription.every,
      subscription.period,
      DateTimezoneUtils.currentCalendarDay(now, timezone),
    ).getTime(),
  ).toISOString();
  if (Date.parse(nextPaymentDate) > now.getTime()) return nextPaymentDate;

  const nextOccurrence = RecurrenceUtils.addPeriod(
    DateTimezoneUtils.toCalendarDay(nextPaymentDate),
    subscription.every,
    subscription.period,
    { anchorDate: DateTimezoneUtils.toCalendarDay(subscription.paymentDate) },
  );
  return new Date(nextOccurrence.getTime()).toISOString();
};

/**
 * Resolves when a scheduled price change should take effect.
 *
 * Returns `null` when `mode` is `"customDate"` and no `customDate` was supplied
 * — the caller in `apps/server` turns that into `CustomDateRequiredError`,
 * since a pure package cannot import server error classes.
 *
 * When a custom date falls on the same calendar day as the next renewal, the
 * exact renewal instant wins over midnight, so the boundary and the charge land
 * together rather than hours apart.
 */
export const resolveScheduledEffectiveAt = (
  subscription: PhaseSubject,
  request: ScheduleEffectiveAtRequest,
  now: Date,
  timezone?: string,
): string | null => {
  if (request.mode === "nextOccurrence") {
    return resolveNextOccurrenceEffectiveAt(subscription, now, timezone);
  }
  if (!request.customDate) return null;

  const customEffectiveAt = toStartOfUtcDay(request.customDate);
  const nextOccurrenceEffectiveAt = resolveNextOccurrenceEffectiveAt(
    subscription,
    now,
    timezone,
  );
  if (isSameUtcDay(customEffectiveAt, nextOccurrenceEffectiveAt)) {
    return nextOccurrenceEffectiveAt;
  }
  return customEffectiveAt;
};

/** Normalizes a date-ish value to an ISO string, or `null` for null-ish input. */
export const normalizeIsoDate = (
  value?: string | Date | null,
): string | null => {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
};

/**
 * Formats a money amount for the `numeric(10,2)` column. Always exactly two
 * decimals — the column is compared as a string, so "12" and "12.00" would
 * otherwise not be equal.
 */
export const normalizeAmount = (value: number): string => value.toFixed(2);
