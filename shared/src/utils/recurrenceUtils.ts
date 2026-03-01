import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isSameDay,
} from "date-fns";
import { SubscriptionPeriod } from "../types";

export class RecurrenceUtils {
  /**
   * Adds a specific period to a date.
   */
  static addPeriod(
    date: Date,
    amount: number,
    period: SubscriptionPeriod,
  ): Date {
    switch (period) {
      case SubscriptionPeriod.DAY:
        return addDays(date, amount);
      case SubscriptionPeriod.WEEK:
        return addWeeks(date, amount);
      case SubscriptionPeriod.MONTH:
        return addMonths(date, amount);
      case SubscriptionPeriod.YEAR:
        return addYears(date, amount);
      default:
        return date;
    }
  }

  /**
   * Calculates the next occurrence of a recurring event relative to a target date (usually "now").
   * The recurrence is anchored at startDate and always moves forward.
   */
  static getNextOccurrence(
    startDate: Date | string,
    every: number,
    period: SubscriptionPeriod,
    relativeTo: Date = new Date(),
  ): Date {
    let current = new Date(startDate);
    const target = new Date(relativeTo);

    if (isBefore(target, current)) {
      return current;
    }

    while (isBefore(current, target) && !isSameDay(current, target)) {
      current = this.addPeriod(current, every, period);
    }

    return current;
  }

  static getPreviousOccurrence(
    startDate: Date | string,
    every: number,
    period: SubscriptionPeriod,
    relativeTo: Date = new Date(),
  ): Date | null {
    const start = new Date(startDate);
    const target = new Date(relativeTo);

    if (isBefore(target, start) || isSameDay(target, start)) {
      return null;
    }

    let current = start;
    let previous = start;

    while (isBefore(current, target)) {
      previous = current;
      current = this.addPeriod(current, every, period);

      if (isSameDay(current, target)) {
        return current;
      }
    }

    return previous;
  }
}
