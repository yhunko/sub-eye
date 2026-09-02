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
  /**
   * The month BEFORE this one, so a client can print the delta without asking
   * for a second month. Carried here rather than derived from two queries
   * because the two would be projected independently and could disagree at a
   * boundary — and because the delta is a property of a month, not of a screen.
   */
  previousMonthTotal: number;
  /** Only days that hold something, ascending. */
  days: CalendarDayDto[];
}

export interface CalendarYearMonthDto {
  /** First day of the month, UTC midnight. */
  month: string;
  total: number;
  /**
   * What each day of the month charges, index 0 = the 1st. Length is the
   * month's OWN day count, so a renderer never has to know how long February
   * is — and a day with nothing on it is a `0` rather than a gap.
   */
  dayTotals: number[];
}

export interface CalendarYearDto {
  /** 1 January, UTC midnight. */
  year: string;
  currencyCode: string;
  total: number;
  /**
   * The heaviest single day in the year, and the top of a heatmap's scale.
   * Zero for a year with no charges at all, which a renderer must treat as
   * "no scale" rather than dividing by it.
   */
  heaviestDayTotal: number;
  /** Always twelve, January first, whether or not a month holds anything. */
  months: CalendarYearMonthDto[];
}
