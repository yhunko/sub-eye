export interface CashFlowPoint {
  date: string; // ISO Date
  formattedDate: string; // e.g. "Oct 12"
  amount: number; // The amount due on this day
  cumulative: number; // Total money needed by this day
}

export interface SubscriptionAnalyticsDto {
  preferredCurrencyCode: number;
  monthlyBurnRate: number;
  yearlyForecast: number;
  cashFlowForecast: CashFlowPoint[];
  totalUpcomingMonth: number;
}
