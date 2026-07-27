import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isBefore,
  isSameDay,
} from "date-fns";
import { SubscriptionPeriod } from "../types";

export class RecurrenceUtils {
  private static normalizeDateInput(value: Date | string): Date {
    return typeof value === "string" ? new Date(value) : value;
  }

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
    const day = Math.min(
      anchorDay,
      RecurrenceUtils.getDaysInMonth(year, month),
    );

    shifted.setDate(day);
    return shifted;
  }

  private static addYearsWithAnchor(
    date: Date,
    amount: number,
    anchorMonth: number,
    anchorDay: number,
  ): Date {
    const shifted = addYears(date, amount);
    const year = shifted.getFullYear();
    const day = Math.min(
      anchorDay,
      RecurrenceUtils.getDaysInMonth(year, anchorMonth),
    );

    shifted.setMonth(anchorMonth, day);
    return shifted;
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
      ? RecurrenceUtils.normalizeDateInput(options.anchorDate)
      : date;

    switch (period) {
      case SubscriptionPeriod.DAY:
        return addDays(date, amount);
      case SubscriptionPeriod.WEEK:
        return addWeeks(date, amount);
      case SubscriptionPeriod.MONTH:
        return RecurrenceUtils.addMonthsWithAnchor(
          date,
          amount,
          anchor.getDate(),
        );
      case SubscriptionPeriod.YEAR:
        return RecurrenceUtils.addYearsWithAnchor(
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
    let current = RecurrenceUtils.normalizeDateInput(startDate);
    const anchorDate = RecurrenceUtils.normalizeDateInput(startDate);
    const target = RecurrenceUtils.normalizeDateInput(relativeTo);

    if (isBefore(target, current)) {
      return current;
    }

    while (isBefore(current, target) && !isSameDay(current, target)) {
      current = RecurrenceUtils.addPeriod(current, every, period, {
        anchorDate,
      });
    }

    return current;
  }

  static getPreviousOccurrence(
    startDate: Date | string,
    every: number,
    period: SubscriptionPeriod,
    relativeTo: Date = new Date(),
  ): Date | null {
    const start = RecurrenceUtils.normalizeDateInput(startDate);
    const anchorDate = RecurrenceUtils.normalizeDateInput(startDate);
    const target = RecurrenceUtils.normalizeDateInput(relativeTo);

    if (isBefore(target, start) || isSameDay(target, start)) {
      return null;
    }

    let current = start;
    let previous = start;

    while (isBefore(current, target)) {
      previous = current;
      current = RecurrenceUtils.addPeriod(current, every, period, {
        anchorDate,
      });

      if (isSameDay(current, target)) {
        return current;
      }
    }

    return previous;
  }
}
