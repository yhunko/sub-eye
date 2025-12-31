import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";

export interface CashFlowPoint {
  date: string;
  amount: number;
  cumulative: number;
}

export interface UpcomingRenewalDto {
  id: number;
  name: string;
  brandDomain: SubscriptionSchema["brandDomain"];
  provider: string;
  amount: number;
  currencyCode: number;
  nextPaymentDate: string;
  daysUntil: number;
}

export interface MostExpensiveSubscriptionDto {
  name: string;
  yearlyAmount: number;
  brandDomain: SubscriptionSchema["brandDomain"];
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
