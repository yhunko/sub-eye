import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
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

  static subtractPeriod(
    date: Date,
    amount: number,
    period: SubscriptionPeriod,
  ): Date {
    switch (period) {
      case SubscriptionPeriod.DAY:
        return subDays(date, amount);
      case SubscriptionPeriod.WEEK:
        return subWeeks(date, amount);
      case SubscriptionPeriod.MONTH:
        return subMonths(date, amount);
      case SubscriptionPeriod.YEAR:
        return subYears(date, amount);
      default:
        return date;
    }
  }

  /**
   * Calculates the next occurrence of a recurring event relative to a target date (usually "now").
   * Moves only forward from startDate.
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

  /**
   * Finds the first occurrence on or after the target date, assuming the cycle
   * extends infinitely into the past and future from the anchor input date.
   */
  static getFirstOccurrenceOnOrAfter(
    anchorDate: Date | string,
    every: number,
    period: SubscriptionPeriod,
    targetDate: Date,
  ): Date {
    let current = new Date(anchorDate);
    const target = new Date(targetDate);

    if (isBefore(current, target)) {
      // Move forward until we reach or pass target
      while (isBefore(current, target)) {
        current = this.addPeriod(current, every, period);
      }
      return current;
    } else {
      // Current is >= target.
      // Move backwards to find the earliest occurrence that is still >= target
      // (i.e. find the one just before target, then take the next one)
      while (!isBefore(current, target)) {
        const prev = this.subtractPeriod(current, every, period);
        if (isBefore(prev, target)) {
          // Found the boundary. 'current' is the first one >= target.
          return current;
        }
        current = prev;
      }
      return current;
    }
  }
}
