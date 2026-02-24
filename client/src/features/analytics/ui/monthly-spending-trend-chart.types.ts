import type { Locale } from "date-fns";
import type { MonthlyTrendPoint } from "shared";

export type MonthlySpendingTrendVariantProps = {
  monthlyTrend: MonthlyTrendPoint[];
  preferredCurrencyCode: string;
  currencySymbol: string;
  yAxisWidth: number;
  locale: Locale;
};
