import { TZDate } from "@date-fns/tz";
import { addMonths, isSameDay, parseISO } from "date-fns";

export class DateTimezoneUtils {
  /**
   * Returns current date, adjusted to timezone if provided.
   */
  static now(timezone?: string): Date {
    return timezone ? new TZDate(new Date(), timezone) : new Date();
  }

  /**
   * Converts a specific date to the target timezone if provided.
   */
  static toZoned(date: string | Date, timezone?: string): Date {
    if (!timezone) {
      if (date instanceof Date) {
        return new Date(date.getTime());
      }

      return parseISO(date);
    }

    if (typeof date === "string") {
      return new TZDate(date, timezone);
    }

    return new TZDate(date, timezone);
  }

  /**
   * Returns start of day in the given timezone context.
   */
  static startOfDay(date: string | Date, timezone?: string): Date {
    const zoned = this.toZoned(date, timezone);
    zoned.setHours(0, 0, 0, 0);
    return zoned;
  }

  /**
   * Returns end of day in the given timezone context.
   */
  static endOfDay(date: string | Date, timezone?: string): Date {
    const zoned = this.toZoned(date, timezone);
    zoned.setHours(23, 59, 59, 999);
    return zoned;
  }

  /**
   * Returns start of month in the given timezone context.
   */
  static startOfMonth(date: string | Date, timezone?: string): Date {
    const zoned = this.toZoned(date, timezone);
    zoned.setDate(1);
    zoned.setHours(0, 0, 0, 0);
    return zoned;
  }

  /**
   * Returns end of month in the given timezone context.
   */
  static endOfMonth(date: string | Date, timezone?: string): Date {
    const zoned = this.toZoned(date, timezone);
    zoned.setMonth(zoned.getMonth() + 1, 0);
    zoned.setHours(23, 59, 59, 999);
    return zoned;
  }

  /**
   * Shifts a date by calendar months in the given timezone context.
   */
  static shiftMonths(
    date: string | Date,
    months: number,
    timezone?: string,
  ): Date {
    const zoned = this.toZoned(date, timezone);
    return addMonths(zoned, months);
  }

  /**
   * Compares two dates by calendar day in the given timezone context.
   */
  static isSameDay(
    left: string | Date,
    right: string | Date,
    timezone?: string,
  ): boolean {
    return isSameDay(
      this.toZoned(left, timezone),
      this.toZoned(right, timezone),
    );
  }
}
