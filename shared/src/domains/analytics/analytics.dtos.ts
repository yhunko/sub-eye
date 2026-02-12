/**
 * Analytics DTOs shared between server and client.
 * Used for dashboard analytics, monthly spend summary, and weekly renewals.
 */

export interface CashFlowSubscription {
  name: string;
  brandDomain: string | null;
  amount: number;
}

export interface CashFlowPoint {
  date: string;
  amount: number;
  cumulative: number;
  subscriptions: CashFlowSubscription[];
}

export interface UpcomingRenewalDto {
  id: string;
  name: string;
  brandDomain: string | null;
  provider: string;
  amount: number;
  currencyCode: string;
  nextPaymentDate: string;
  daysUntil: number;
}

export interface MostExpensiveSubscriptionDto {
  name: string;
  yearlyAmount: number;
  brandDomain: string | null;
}

export interface MonthlyTrendSubscription {
  name: string;
  brandDomain: string | null;
  amount: number;
  currencyCode: string;
}

export interface MonthlyTrendPoint {
  date: string;
  amount: number;
  subscriptions: MonthlyTrendSubscription[];
}

export interface MonthlySpendTrendPoint {
  date: string;
  amount: number;
}

export interface MonthlySpendSummaryDto {
  currencyCode: string;
  currentMonthTotal: number;
  previousMonthTotal: number;
  deltaPercentage: number | null;
  trend: MonthlySpendTrendPoint[];
}

export interface WeeklyRenewalTrendPoint {
  date: string;
  amount: number;
}

export interface WeeklyRenewalsSummaryDto {
  currencyCode: string;
  totalUpcomingWeek: number;
  totalThisWeek: number;
  trend: WeeklyRenewalTrendPoint[];
}

export interface DashboardAnalyticsDto {
  preferredCurrencyCode: string;
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
  monthlyTrend: MonthlyTrendPoint[];
}
