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
  private static getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  private static addMonthsWithAnchor(
    date: Date,
    amount: number,
    anchorDay: number,
  ): Date {
    const shifted = addMonths(date, amount);
    const year = shifted.getFullYear();
    const month = shifted.getMonth();
    const day = Math.min(anchorDay, this.getDaysInMonth(year, month));
    const result = new Date(shifted);

    result.setDate(day);
    return result;
  }

  private static addYearsWithAnchor(
    date: Date,
    amount: number,
    anchorMonth: number,
    anchorDay: number,
  ): Date {
    const shifted = addYears(date, amount);
    const year = shifted.getFullYear();
    const day = Math.min(anchorDay, this.getDaysInMonth(year, anchorMonth));
    const result = new Date(shifted);

    result.setMonth(anchorMonth, day);
    return result;
  }

  /**
   * Adds a specific period to a date.
   */
  static addPeriod(
    date: Date,
    amount: number,
    period: SubscriptionPeriod,
    options?: {
      anchorDate?: Date | string;
    },
  ): Date {
    const anchor = options?.anchorDate
      ? new Date(options.anchorDate)
      : new Date(date);

    switch (period) {
      case SubscriptionPeriod.DAY:
        return addDays(date, amount);
      case SubscriptionPeriod.WEEK:
        return addWeeks(date, amount);
      case SubscriptionPeriod.MONTH:
        return this.addMonthsWithAnchor(date, amount, anchor.getDate());
      case SubscriptionPeriod.YEAR:
        return this.addYearsWithAnchor(
          date,
          amount,
          anchor.getMonth(),
          anchor.getDate(),
        );
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
    const anchorDate = new Date(startDate);
    const target = new Date(relativeTo);

    if (isBefore(target, current)) {
      return current;
    }

    while (isBefore(current, target) && !isSameDay(current, target)) {
      current = this.addPeriod(current, every, period, { anchorDate });
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
    const anchorDate = new Date(startDate);
    const target = new Date(relativeTo);

    if (isBefore(target, start) || isSameDay(target, start)) {
      return null;
    }

    let current = start;
    let previous = start;

    while (isBefore(current, target)) {
      previous = current;
      current = this.addPeriod(current, every, period, { anchorDate });

      if (isSameDay(current, target)) {
        return current;
      }
    }

    return previous;
  }
}
