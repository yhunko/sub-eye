import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  isPast,
} from "date-fns";
import { Period } from "@/shared/lib/db";
import { DateTimezoneUtils } from "@/shared/lib";

export class SubscriptionDateService {
  static getNextBillDate(
    startDate: Date,
    every: number,
    period: Period,
    timezone?: string,
  ): Date {
    const now = DateTimezoneUtils.now(timezone);
    let current = DateTimezoneUtils.toZoned(startDate, timezone);

    // Roll forward logic
    while (isPast(current) && differenceInDays(now, current) > 0) {
      current = this.addPeriod(current, every, period);
    }

    return current;
  }

  private static addPeriod(date: Date, amount: number, period: Period): Date {
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
}
