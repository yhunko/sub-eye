import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isSameDay,
} from "date-fns";
import { Period } from "./db";

export class RecurrenceUtils {
  /**
   * Adds a specific period to a date.
   */
  static addPeriod(date: Date, amount: number, period: Period): Date {
    switch (period) {
      case Period.DAY:
        return addDays(date, amount);
      case Period.WEEK:
        return addWeeks(date, amount);
      case Period.MONTH:
        return addMonths(date, amount);
      case Period.YEAR:
        return addYears(date, amount);
      default:
        return date;
    }
  }

  /**
   * Calculates the next occurrence of a recurring event relative to a target date (usually "now").
   *
   * @param startDate The original start date of the subscription/event.
   * @param every The frequency multiplier (e.g., every 2 weeks).
   * @param period The period unit (day, week, month, year).
   * @param relativeTo The date to compare against. The result will be the first occurrence >= this date.
   *                   Defaults to new Date().
   */
  static getNextOccurrence(
    startDate: Date | string,
    every: number,
    period: Period,
    relativeTo: Date = new Date(),
  ): Date {
    let current = new Date(startDate);
    const target = new Date(relativeTo);

    // If the start date is already in the future relative to target, return it.
    if (isBefore(target, current)) {
      return current;
    }

    // Optimization: For simple cases (monthly/yearly), we might want to do math,
    // but iteration is safest for handling leap years and variable month lengths accurately.
    // Given subscription data isn't 100 years old, while loops are negligible in cost.
    while (isBefore(current, target) && !isSameDay(current, target)) {
      current = this.addPeriod(current, every, period);
    }

    return current;
  }
}
