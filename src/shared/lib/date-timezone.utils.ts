import { TZDate } from "@date-fns/tz";
import { parseISO } from "date-fns";

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
  static toZoned(date: string, timezone?: string): Date {
    return timezone ? new TZDate(date, timezone) : parseISO(date);
  }
}
