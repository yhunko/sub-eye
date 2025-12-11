import { TZDate } from "@date-fns/tz";

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
  static toZoned(date: Date, timezone?: string): Date {
    return timezone ? new TZDate(date, timezone) : date;
  }
}
