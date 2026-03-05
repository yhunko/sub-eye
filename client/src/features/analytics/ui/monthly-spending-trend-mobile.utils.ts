import { isSameMonth, parseISO } from "date-fns";
import type { MonthlyTrendPoint } from "shared";

export const resolveSelectedMonthIndex = (
  monthlyTrend: MonthlyTrendPoint[],
  monthlyTrendMonth: string | undefined,
) => {
  if (!monthlyTrend.length) {
    return -1;
  }

  if (!monthlyTrendMonth) {
    const currentMonthIndex = monthlyTrend.findIndex((month) =>
      isSameMonth(parseISO(month.date), new Date()),
    );

    return currentMonthIndex >= 0 ? currentMonthIndex : monthlyTrend.length - 1;
  }

  const monthIndex = monthlyTrend.findIndex(
    (month) => month.date === monthlyTrendMonth,
  );

  return monthIndex >= 0 ? monthIndex : monthlyTrend.length - 1;
};
