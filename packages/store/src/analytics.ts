import { isCurrentlyActiveSubscription } from "@subeye/lifecycle";
import type {
  DashboardAnalyticsDto,
  MonthlySpendSummaryDto,
  MonthlySpendTrendPoint,
  SubscriptionDto,
} from "@subeye/model";
import { CurrencyUtils } from "@subeye/money";
import { AnalyticsCalculator } from "@subeye/spend";
import { DateTimezoneUtils } from "@subeye/time";
import type { Ports } from "./ports";
import { listSubscriptions } from "./subscriptionUseCases";

/**
 * Every number below comes from `AnalyticsCalculator`, which is pure and tested
 * on its own. What lives here is the composition — which list feeds which
 * metric — and that is the part no calculator can enforce.
 */
export const buildDashboard = async (
  ports: Ports,
): Promise<DashboardAnalyticsDto> => {
  const { subscriptions, preferredCurrencyCode, timezone, today } =
    await analyticsContext(ports);
  const categories = await ports.categories.all();

  const oneYearFromNow = DateTimezoneUtils.shiftCalendarMonths(today, 12);

  // Two filters, in sequence. Everything below reads the SECOND list: a paused
  // subscription still has upcoming occurrences, and none of them are charges.
  const analyticsEligibleSubscriptions = subscriptions.filter((subscription) =>
    AnalyticsCalculator.hasUpcomingOccurrence(subscription, today),
  );
  const currentlyActiveSubscriptions = analyticsEligibleSubscriptions.filter(
    (subscription) => isCurrentlyActiveSubscription(subscription.status),
  );

  const monthlyBurnRate = currentlyActiveSubscriptions.reduce(
    (total, subscription) => total + subscription.billing.preferred.monthly,
    0,
  );

  const mostExpensiveSubscription = AnalyticsCalculator.findMostExpensive(
    currentlyActiveSubscriptions,
  );

  const upcomingRenewals = AnalyticsCalculator.nextOccurrenceRenewals(
    currentlyActiveSubscriptions,
    today,
    preferredCurrencyCode,
  ).slice(0, 5);

  const {
    forecast: cashFlowForecast,
    remainingThisMonth,
    totalUpcomingMonth,
  } = AnalyticsCalculator.buildCashFlowForecast(
    currentlyActiveSubscriptions,
    today,
    timezone,
  );

  const nextMonthForecast =
    AnalyticsCalculator.buildMonthlyTrend(
      currentlyActiveSubscriptions,
      DateTimezoneUtils.shiftCalendarMonths(today, 1),
      1,
      timezone,
    )[0]?.amount ?? 0;

  const categorySpending = AnalyticsCalculator.buildCategorySpending(
    currentlyActiveSubscriptions,
    categories,
  );

  // yearlyForecast counts the occurrences that actually land in the next 12
  // months — NOT monthlyBurnRate * 12. A cancelling subscription that lapses
  // mid-year, or a paused one, keeps a full monthly run-rate but contributes
  // fewer charges to the year.
  const yearlyForecast = Number(
    AnalyticsCalculator.sumSpendInRange(
      currentlyActiveSubscriptions,
      today,
      oneYearFromNow,
    ).toFixed(2),
  );

  return {
    preferredCurrencyCode,
    monthlyBurnRate,
    yearlyForecast,
    remainingThisMonth,
    nextMonthForecast,
    activeSubscriptionsTotal: currentlyActiveSubscriptions.length,
    mostExpensiveSubscription,
    cashFlowForecast,
    upcomingRenewals,
    totalUpcomingMonth,
    categorySpending,
    timezone,
  };
};

export const buildMonthlySummary = async (
  ports: Ports,
): Promise<MonthlySpendSummaryDto> => {
  const { subscriptions, preferredCurrencyCode, today } =
    await analyticsContext(ports);

  // Last month, this month, and the six ahead — the window the trend renders.
  const monthOffsets = [-1, 0, 1, 2, 3, 4, 5, 6];

  const trend: MonthlySpendTrendPoint[] = monthOffsets.map((offset) => {
    const monthRef = DateTimezoneUtils.shiftCalendarMonths(today, offset);
    const monthStart = DateTimezoneUtils.startOfCalendarMonth(monthRef);
    const total = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      monthStart,
      DateTimezoneUtils.endOfCalendarMonth(monthRef),
    );
    return {
      date: monthStart.toISOString(),
      amount: Number(total.toFixed(2)),
    };
  });

  const currentMonthTotal =
    trend.find((_, index) => monthOffsets[index] === 0)?.amount ?? 0;
  const previousMonthTotal =
    trend.find((_, index) => monthOffsets[index] === -1)?.amount ?? 0;

  return {
    currencyCode: preferredCurrencyCode,
    currentMonthTotal,
    previousMonthTotal,
    // Null, not zero and not Infinity: with nothing spent last month there is
    // no percentage to show, and the client renders the absence.
    deltaPercentage:
      previousMonthTotal > 0
        ? Number(
            (
              ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) *
              100
            ).toFixed(1),
          )
        : null,
    trend,
  };
};

const analyticsContext = async (
  ports: Ports,
): Promise<{
  subscriptions: SubscriptionDto[];
  preferredCurrencyCode: string;
  timezone: string;
  today: Date;
}> => {
  const [subscriptions, preferences] = await Promise.all([
    listSubscriptions(ports),
    ports.preferences.read(),
  ]);

  return {
    subscriptions,
    preferredCurrencyCode:
      subscriptions[0]?.billing.preferred.currencyCode ??
      CurrencyUtils.normalizeCode(preferences.preferredCurrency),
    timezone: preferences.preferredTimezone,
    // The user's current calendar day, as the UTC midnight every stored date is
    // expressed in — not `startOfDay(now, timezone)`, which is that day's start
    // as an INSTANT and therefore a different value from the days it is
    // compared against everywhere below.
    today: DateTimezoneUtils.currentCalendarDay(
      ports.now(),
      preferences.preferredTimezone,
    ),
  };
};
