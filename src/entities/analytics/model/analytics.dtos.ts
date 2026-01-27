import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";

export interface CashFlowPoint {
  date: string;
  amount: number;
  cumulative: number;
}

export interface UpcomingRenewalDto {
  id: string;
  name: string;
  brandDomain: SubscriptionSchema["brandDomain"];
  provider: string;
  amount: number;
  currencyCode: string;
  nextPaymentDate: string;
  daysUntil: number;
}

export interface MostExpensiveSubscriptionDto {
  name: string;
  yearlyAmount: number;
  brandDomain: SubscriptionSchema["brandDomain"];
}

export interface MonthlyTrendPoint {
  date: string;
  amount: number;
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
