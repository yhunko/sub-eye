import { TZDate } from "@date-fns/tz";
import { parseISO } from "date-fns";

/**
 * Dates in this app are CALENDAR DAYS, not instants.
 *
 * `paymentDate`, `willBeCancelledAt`, `resumeAt` and every price-phase boundary
 * answer "which day", and they are stored as that day's UTC midnight — the
 * mobile client writes them with `toIsoDay` and reads them back with
 * `timeZone: "UTC"`. Everything below therefore works in one calendar, UTC, and
 * the account's IANA timezone decides only WHICH day (or month) it currently is
 * for the user, never how a stored day is read back.
 *
 * Mixing the two is what made a single charge disagree with itself: a
 * subscription anchored on 6 February in Europe/Kyiv, projected through the
 * account's zone, kept its 02:00 wall clock across the DST change and landed on
 * `2026-08-05T23:00Z` — the 5th to every UTC reader in the app, the 6th to the
 * widget's device calendar, and the 6th on the actual invoice.
 */
export class DateTimezoneUtils {
  /**
   * Returns current date, adjusted to timezone if provided.
   */
  static now(timezone?: string): Date {
    return timezone ? new TZDate(new Date(), timezone) : new Date();
  }

  /** A stored day value, ready for calendar arithmetic. Always UTC. */
  static toCalendarDay(date: string | Date): Date {
    return DateTimezoneUtils.toZoned(date, "UTC");
  }

  /**
   * The calendar day it currently is for the user, as a day value.
   *
   * The timezone picks the day; the result is that day's UTC midnight, so it
   * compares directly against a stored one. A zoned start-of-day instant does
   * not: west of UTC it never equals the UTC midnight of the same day, and
   * `getNextOccurrence` stepped straight past a payment falling today.
   */
  static currentCalendarDay(date: string | Date, timezone?: string): Date {
    const zoned = DateTimezoneUtils.toZoned(date, timezone);
    return DateTimezoneUtils.calendarDay(
      zoned.getFullYear(),
      zoned.getMonth(),
      zoned.getDate(),
    );
  }

  /** The last instant of a calendar day — an inclusive range bound. */
  static endOfCalendarDay(day: Date): Date {
    return new Date(day.getTime() + 86_399_999);
  }

  /** `days` later, as a calendar day. */
  static shiftCalendarDays(day: Date, days: number): Date {
    return new Date(day.getTime() + days * 86_400_000);
  }

  /**
   * `months` later, clamped to the shorter month: 31 January + 1 month is
   * 28 February, and it does not silently roll into March.
   */
  static shiftCalendarMonths(day: Date, months: number): Date {
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return DateTimezoneUtils.calendarDay(
      year,
      month,
      Math.min(day.getUTCDate(), lastDay),
    );
  }

  /** First calendar day of the month `day` falls in. */
  static startOfCalendarMonth(day: Date): Date {
    return DateTimezoneUtils.calendarDay(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      1,
    );
  }

  /** Last instant of the month `day` falls in — an inclusive range bound. */
  static endOfCalendarMonth(day: Date): Date {
    return DateTimezoneUtils.endOfCalendarDay(
      DateTimezoneUtils.calendarDay(
        day.getUTCFullYear(),
        day.getUTCMonth() + 1,
        0,
      ),
    );
  }

  /** Whether two values name the same calendar day. */
  static isSameCalendarDay(left: Date, right: Date): boolean {
    return (
      DateTimezoneUtils.calendarDay(
        left.getUTCFullYear(),
        left.getUTCMonth(),
        left.getUTCDate(),
      ).getTime() ===
      DateTimezoneUtils.calendarDay(
        right.getUTCFullYear(),
        right.getUTCMonth(),
        right.getUTCDate(),
      ).getTime()
    );
  }

  private static calendarDay(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month, day));
  }

  /**
   * The same instant seen from `timezone`. Private on purpose: a zoned value is
   * only ever an intermediate step towards a calendar day, and reaching for one
   * to read a stored date back is the bug this class exists to prevent.
   */
  private static toZoned(date: string | Date, timezone?: string): Date {
    if (!timezone) {
      return date instanceof Date ? new Date(date.getTime()) : parseISO(date);
    }
    // Narrowed rather than passed straight through: `TZDate` has a
    // `(year, month, timeZone)` overload that a `string | Date` union matches
    // against instead of the intended one.
    return typeof date === "string"
      ? new TZDate(date, timezone)
      : new TZDate(date, timezone);
  }
}
