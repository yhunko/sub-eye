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
  id: string;
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

export interface CategorySpendingDto {
  categoryId: string | null;
  name: string;
  emoji: string;
  amount: number;
  subscriptions: CategorySpendingSubscriptionDto[];
}

export interface CategorySpendingSubscriptionDto {
  id: string;
  name: string;
  brandDomain: string | null;
  monthlyCost: number;
}

export interface DashboardAnalyticsDto {
  preferredCurrencyCode: string;
  monthlyBurnRate: number;
  yearlyForecast: number;
  remainingThisMonth: number;
  nextMonthForecast: number;
  activeSubscriptionsTotal: number;
  mostExpensiveSubscription: MostExpensiveSubscriptionDto | null;
  cashFlowForecast: CashFlowPoint[];
  upcomingRenewals: UpcomingRenewalDto[];
  totalUpcomingMonth: number;
  categorySpending: CategorySpendingDto[];
  timezone: string;
}

/**
 * One dated thing that happens to a subscription.
 *
 * The same vocabulary and the same order the mobile client's `deriveAttention`
 * uses for Home's rail. One list of kinds, so the rail and the calendar cannot
 * come to different conclusions about what a given day contains.
 */
export type CalendarEventKind =
  | "trialEnds"
  | "introEnds"
  | "priceChange"
  | "payment"
  | "resumes"
  | "ends";

export interface CalendarEventDto {
  /** `${subscriptionId}:${kind}:${date}` — a weekly sub raises one per charge. */
  key: string;
  subscriptionId: string;
  name: string;
  brandDomain: string | null;
  kind: CalendarEventKind;
  date: string;
  amount: number;
  currencyCode: string;
}

export interface CalendarDayDto {
  date: string;
  /**
   * `payment` events ONLY. A phase boundary, a resume and a cancellation are
   * all dated notices — no money moves on their day — and counting them here
   * would put a number on the tile that never leaves the account. It is also
   * what keeps the month total equal to `MonthlySpendSummaryDto`.
   */
  total: number;
  events: CalendarEventDto[];
}

export interface CalendarMonthDto {
  /** First day of the month, UTC midnight, like every other stored date. */
  month: string;
  currencyCode: string;
  monthTotal: number;
  /** Only days that hold something, ascending. */
  days: CalendarDayDto[];
}
