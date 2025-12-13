import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
} from "date-fns";
import { DateTimezoneUtils } from "@/shared/lib";

export interface BillDisplayState {
  formattedDate: string;
  relativeText: string;
  colorClass: string;
}

export class SubscriptionUIMapper {
  static toDisplayState(targetDate: Date, timezone?: string): BillDisplayState {
    const now = DateTimezoneUtils.now(timezone);
    const daysUntil = differenceInCalendarDays(targetDate, now);

    return {
      formattedDate: format(targetDate, "MMM d, yyyy"),
      ...this.getUrgencyStyles(targetDate, daysUntil),
    };
  }

  private static getUrgencyStyles(targetDate: Date, daysUntil: number) {
    if (isToday(targetDate)) {
      return {
        relativeText: "Today",
        colorClass: "text-red-600 font-semibold",
      };
    }

    if (isTomorrow(targetDate)) {
      return {
        relativeText: "Tomorrow",
        colorClass: "text-orange-500 font-medium",
      };
    }

    const relativeText = `in ${daysUntil} days`;

    if (daysUntil <= 3) {
      return { relativeText, colorClass: "text-red-500 font-medium" };
    }
    if (daysUntil <= 7) {
      return { relativeText, colorClass: "font-medium text-orange-500" };
    }
    if (daysUntil <= 14) {
      return { relativeText, colorClass: "text-yellow-600" };
    }

    return { relativeText, colorClass: "text-gray-500" };
  }
}
