export interface CashFlowPoint {
  date: string;
  amount: number;
  cumulative: number;
}

export interface UpcomingRenewalDto {
  id: number;
  name: string;
  provider: string;
  amount: number;
  currencyCode: number;
  nextPaymentDate: string;
  daysUntil: number;
}

export interface MostExpensiveSubscriptionDto {
  name: string;
  yearlyAmount: number;
}

export interface DashboardAnalyticsDto {
  preferredCurrencyCode: number;
  monthlyBurnRate: number;
  yearlyForecast: number;
  remainingThisMonth: number;
  activeSubscriptionsTotal: number;
  activeSubscriptionsAuto: number;
  activeSubscriptionsManual: number;
  mostExpensiveSubscription: MostExpensiveSubscriptionDto | null;
  cashFlowForecast: CashFlowPoint[];
  upcomingRenewals: UpcomingRenewalDto[];
  totalUpcomingMonth: number;
  currencyCode: number;
}
