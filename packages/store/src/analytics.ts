import { isCurrentlyActiveSubscription } from "@subeye/lifecycle";
import type {
  CalendarDayDto,
  CalendarEventDto,
  CalendarEventKind,
  CalendarMonthDto,
  CalendarYearDto,
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

/**
 * The same order Home's rail ranks its events in: a price about to change costs
 * money, a charge is money leaving, a resume is a heads-up, an ending is an FYI.
 */
const CALENDAR_RANK: Record<CalendarEventKind, number> = {
  trialEnds: 0,
  introEnds: 1,
  priceChange: 2,
  payment: 3,
  resumes: 4,
  ends: 5,
};

/**
 * Everything dated that lands in one calendar month, grouped by day.
 *
 * `collectPaymentsInRange` rather than each subscription's `nextPaymentDate`:
 * a weekly subscription is charged four or five times in a month and every one
 * of them is a day the user is looking for. Reading the single "next" field
 * instead is what makes a tile appear on a day with nothing behind it.
 *
 * Fed the UNFILTERED list, exactly as `buildMonthlySummary` is. Cancellation and
 * pause are decided per occurrence inside the projection, so narrowing to
 * "currently active" first would erase a past month's real charges — and would
 * put a different total on this screen than the one Home's hero already shows
 * for the same month.
 */
export const buildCalendarMonth = async (
  ports: Ports,
  month?: string,
): Promise<CalendarMonthDto> => {
  const { subscriptions, preferredCurrencyCode, today } =
    await analyticsContext(ports);

  const anchor = month ? DateTimezoneUtils.toCalendarDay(month) : today;
  const monthStart = DateTimezoneUtils.startOfCalendarMonth(anchor);
  const monthEnd = DateTimezoneUtils.endOfCalendarMonth(anchor);

  const events: CalendarEventDto[] = [];

  for (const payment of AnalyticsCalculator.collectPaymentsInRange(
    subscriptions,
    monthStart,
    monthEnd,
  )) {
    // Through `new Date` first: a TZDate's own `toISOString()` emits the offset
    // form (`…+00:00`), and every date this DTO carries is compared as a plain
    // UTC instant by the client.
    const date = new Date(payment.date.getTime()).toISOString();
    events.push({
      key: `${payment.subscription.id}:payment:${date}`,
      subscriptionId: payment.subscription.id,
      name: payment.subscription.name,
      brandDomain: payment.subscription.brandDomain,
      kind: "payment",
      date,
      amount: payment.amount,
      currencyCode: payment.subscription.billing.preferred.currencyCode,
    });
  }

  const inMonth = (iso: string | null | undefined): iso is string => {
    if (!iso) return false;
    const at = Date.parse(iso);
    return (
      !Number.isNaN(at) &&
      at >= monthStart.getTime() &&
      at <= monthEnd.getTime()
    );
  };

  // The three dated events that are NOT charges. Mirrors `deriveAttention`'s
  // rules, bounded to the month instead of to "still ahead" — a calendar showing
  // September has to show September's phase change whether or not it has passed.
  for (const subscription of subscriptions) {
    if (subscription.status === "cancelled") continue;

    const base = {
      subscriptionId: subscription.id,
      name: subscription.name,
      brandDomain: subscription.brandDomain,
    };

    const upcoming = subscription.upcomingPhase;
    if (upcoming && inMonth(upcoming.startsAt)) {
      const kind: CalendarEventKind =
        subscription.effectivePhaseKind === "trial"
          ? "trialEnds"
          : subscription.effectivePhaseKind === "intro"
            ? "introEnds"
            : "priceChange";
      events.push({
        ...base,
        key: `${subscription.id}:${kind}`,
        kind,
        date: upcoming.startsAt,
        amount: upcoming.billing.preferred.amount,
        currencyCode: upcoming.billing.preferred.currencyCode,
      });
    }

    if (subscription.status === "paused" && inMonth(subscription.resumeAt)) {
      events.push({
        ...base,
        key: `${subscription.id}:resumes`,
        kind: "resumes",
        date: subscription.resumeAt,
        amount: subscription.billing.preferred.amount,
        currencyCode: subscription.billing.preferred.currencyCode,
      });
    }

    if (
      subscription.status === "cancelling" &&
      inMonth(subscription.willBeCancelledAt)
    ) {
      events.push({
        ...base,
        key: `${subscription.id}:ends`,
        kind: "ends",
        date: subscription.willBeCancelledAt,
        amount: subscription.billing.preferred.amount,
        currencyCode: subscription.billing.preferred.currencyCode,
      });
    }
  }

  const byDay = new Map<string, CalendarEventDto[]>();
  for (const event of events) {
    // Sliced to the day rather than trusted whole: an occurrence is already UTC
    // midnight, but a phase's `startsAt` is an instant and two phases landing on
    // one day at different times would otherwise open two tiles.
    const day = `${event.date.slice(0, 10)}T00:00:00.000Z`;
    const bucket = byDay.get(day);
    if (bucket) bucket.push(event);
    else byDay.set(day, [event]);
  }

  const days: CalendarDayDto[] = [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, list]) => ({
      date,
      total: Number(
        list
          .filter((event) => event.kind === "payment")
          .reduce((sum, event) => sum + event.amount, 0)
          .toFixed(2),
      ),
      events: list.sort(
        (a, b) =>
          CALENDAR_RANK[a.kind] - CALENDAR_RANK[b.kind] || b.amount - a.amount,
      ),
    }));

  // `sumSpendInRange` rather than a second pass over occurrences: it is the same
  // number `buildMonthlySummary` prints, and a delta that disagreed with Home's
  // own month-over-month figure would be worse than no delta at all.
  const previousMonth = DateTimezoneUtils.shiftCalendarMonths(monthStart, -1);

  return {
    month: new Date(monthStart.getTime()).toISOString(),
    currencyCode: preferredCurrencyCode,
    monthTotal: Number(
      days.reduce((sum, day) => sum + day.total, 0).toFixed(2),
    ),
    previousMonthTotal: Number(
      AnalyticsCalculator.sumSpendInRange(
        subscriptions,
        DateTimezoneUtils.startOfCalendarMonth(previousMonth),
        DateTimezoneUtils.endOfCalendarMonth(previousMonth),
      ).toFixed(2),
    ),
    days,
  };
};

/**
 * Twelve months of daily spend, for the year heatmap.
 *
 * ONE walk over the whole year, not twelve calls to `buildCalendarMonth`: that
 * would re-read and re-parse the subscription list twelve times, and the list
 * read is the expensive half of a projection — the recurrence walk is arithmetic.
 *
 * Payments ONLY, like `CalendarDayDto.total`. A phase boundary and a resume are
 * dated notices with no money behind them, and a heatmap shaded by them would
 * colour a day the user was never charged for.
 *
 * Every month is present whether or not it holds anything, because the grid it
 * feeds is twelve boxes and a missing month would be a hole rather than an
 * empty one.
 */
export const buildCalendarYear = async (
  ports: Ports,
  year?: string,
): Promise<CalendarYearDto> => {
  const { subscriptions, preferredCurrencyCode, today } =
    await analyticsContext(ports);

  const anchor = year ? DateTimezoneUtils.toCalendarDay(year) : today;
  const yearStart = DateTimezoneUtils.startOfCalendarYear(anchor);
  const calendarYear = yearStart.getUTCFullYear();

  const byDay = new Map<string, number>();
  for (const payment of AnalyticsCalculator.collectPaymentsInRange(
    subscriptions,
    yearStart,
    DateTimezoneUtils.endOfCalendarYear(anchor),
  )) {
    const day = new Date(payment.date.getTime()).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + payment.amount);
  }

  let heaviestDayTotal = 0;

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthStart = new Date(Date.UTC(calendarYear, index, 1));
    const dayCount = new Date(
      Date.UTC(calendarYear, index + 1, 0),
    ).getUTCDate();

    const dayTotals = Array.from({ length: dayCount }, (_, slot) => {
      const key = new Date(Date.UTC(calendarYear, index, slot + 1))
        .toISOString()
        .slice(0, 10);
      const total = Number((byDay.get(key) ?? 0).toFixed(2));
      if (total > heaviestDayTotal) heaviestDayTotal = total;
      return total;
    });

    return {
      month: monthStart.toISOString(),
      total: Number(dayTotals.reduce((sum, day) => sum + day, 0).toFixed(2)),
      dayTotals,
    };
  });

  return {
    year: yearStart.toISOString(),
    currencyCode: preferredCurrencyCode,
    total: Number(
      months.reduce((sum, month) => sum + month.total, 0).toFixed(2),
    ),
    heaviestDayTotal,
    months,
  };
};
