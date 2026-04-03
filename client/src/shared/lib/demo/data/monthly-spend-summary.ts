import { addMonths, format } from "date-fns";
import type { MonthlySpendSummaryDto } from "shared";

function generateTrend(): MonthlySpendSummaryDto["trend"] {
  const now = new Date();
  const points: MonthlySpendSummaryDto["trend"] = [];

  const monthlyTotals = [68.99, 82.45, 82.45, 102.44, 121.43, 142.44];

  for (let i = 0; i < 6; i++) {
    const month = addMonths(now, -5 + i);
    points.push({
      date: format(month, "yyyy-MM-01"),
      amount: monthlyTotals[i],
    });
  }

  return points;
}

export const demoMonthlySpendSummary: MonthlySpendSummaryDto = {
  currencyCode: "USD",
  currentMonthTotal: 142.44,
  previousMonthTotal: 121.43,
  deltaPercentage: 17.28,
  trend: generateTrend(),
};
