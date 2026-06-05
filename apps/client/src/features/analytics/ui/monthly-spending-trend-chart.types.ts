import type { MonthlyTrendPoint } from "@subeye/shared";
import type { Locale } from "date-fns";

export type MonthlySpendingTrendVariantProps = {
  monthlyTrend: MonthlyTrendPoint[];
  preferredCurrencyCode: string;
  currencySymbol: string;
  yAxisWidth: number;
  locale: Locale;
};
