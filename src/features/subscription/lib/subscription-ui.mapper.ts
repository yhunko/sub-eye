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
  static toDisplayState(
    targetDate: Date,
    timezone?: string,
    t?: (key: string, params?: { count: number }) => string,
  ): BillDisplayState {
    const now = DateTimezoneUtils.now(timezone);
    const daysUntil = differenceInCalendarDays(targetDate, now);

    return {
      formattedDate: format(targetDate, "MMM d, yyyy"),
      ...this.getUrgencyStyles(targetDate, daysUntil, t),
    };
  }

  private static getUrgencyStyles(
    targetDate: Date,
    daysUntil: number,
    t?: (key: string, params?: { count: number }) => string,
  ) {
    if (isToday(targetDate)) {
      return {
        relativeText: t ? t("today") : "Today",
        colorClass: "text-red-600 font-semibold",
      };
    }

    if (isTomorrow(targetDate)) {
      return {
        relativeText: t ? t("tomorrow") : "Tomorrow",
        colorClass: "text-orange-500 font-medium",
      };
    }

    const relativeText = t
      ? t("inDays", { count: daysUntil })
      : `in ${daysUntil} days`;

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
