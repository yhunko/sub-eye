import { SubscriptionService } from "../../subscription/lib/subscription.service";
import {
  DashboardAnalyticsDto,
  MostExpensiveSubscriptionDto,
} from "../model/analytics.dtos";
import {
  addDays,
  isSameDay,
  startOfDay,
  differenceInCalendarDays,
  isSameMonth,
  format,
  startOfMonth,
  addMonths,
  isBefore,
} from "date-fns";
import { RecurrenceUtils } from "@/shared/lib/recurrence.utils";
import { CurrencyUtils } from "@/shared/lib/currency.utils";

export class AnalyticsService {
  constructor(private subscriptionService = new SubscriptionService()) {}

  async getDashboardStats(userId: string): Promise<DashboardAnalyticsDto> {
    const today = startOfDay(new Date());
    const subscriptions =
      await this.subscriptionService.getSubscriptionsForUser(userId);

    const preferredCurrencyCode =
      subscriptions[0]?.billing.preferred.currencyCode ??
      CurrencyUtils.DEFAULT_CURRENCY_CODE;

    let monthlyBurnRate = 0;
    let activeSubscriptionsAuto = 0;
    let activeSubscriptionsManual = 0;

    let mostExpensiveSubscription: MostExpensiveSubscriptionDto = {
      name: "N/A",
      yearlyAmount: 0,
      brandDomain: "",
    };

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const monthKey = format(startOfMonth(addMonths(today, i)), "yyyy-MM-dd");
      trendMap.set(monthKey, 0);
    }
    const oneYearFromNow = addMonths(today, 12);

    const mappedSubscriptions = subscriptions.map((subscription) => {
      monthlyBurnRate += subscription.billing.preferred.monthly;

      if (subscription.autoPaid) {
        activeSubscriptionsAuto += 1;
      } else {
        activeSubscriptionsManual += 1;
      }

      const yearlyCost = subscription.billing.preferred.monthly * 12;
      if (yearlyCost > mostExpensiveSubscription.yearlyAmount) {
        mostExpensiveSubscription = {
          name: subscription.name,
          yearlyAmount: yearlyCost,
          brandDomain: subscription.brandDomain,
        };
      }

      const nextDate = RecurrenceUtils.getNextOccurrence(
        subscription.paymentDate,
        subscription.every,
        subscription.period,
        today,
      );

      let projectionDate = nextDate;
      while (isBefore(projectionDate, oneYearFromNow)) {
        const monthKey = format(startOfMonth(projectionDate), "yyyy-MM-dd");

        if (trendMap.has(monthKey)) {
          const currentTotal = trendMap.get(monthKey) || 0;
          trendMap.set(
            monthKey,
            currentTotal + subscription.billing.preferred.amount,
          );
        }

        projectionDate = RecurrenceUtils.getNextOccurrence(
          projectionDate,
          subscription.every,
          subscription.period,
          addDays(projectionDate, 1),
        );
      }

      return {
        ...subscription,
        nextPaymentDate: nextDate,
        daysUntil: differenceInCalendarDays(nextDate, today),
      };
    });

    const upcomingRenewals = mappedSubscriptions
      .filter((s) => s.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 4)
      .map(
        ({
          id,
          name,
          category,
          billing,
          nextPaymentDate,
          daysUntil,
          brandDomain,
        }) => ({
          id: id,
          name: name,
          provider: category || "Subscription",
          amount: billing.preferred.amount,
          currencyCode: preferredCurrencyCode,
          nextPaymentDate: nextPaymentDate.toISOString(),
          daysUntil: daysUntil,
          brandDomain,
        }),
      );

    const cashFlowForecast = [];
    let cumulative = 0;
    let remainingThisMonth = 0;

    for (let i = 0; i < 30; i++) {
      const targetDate = addDays(today, i);
      const dueToday = mappedSubscriptions.filter((sub) =>
        isSameDay(sub.nextPaymentDate, targetDate),
      );
      const dailyAmount = dueToday.reduce(
        (sum, s) => sum + s.billing.preferred.amount,
        0,
      );

      cumulative += dailyAmount;
      if (isSameMonth(targetDate, today)) remainingThisMonth += dailyAmount;
      cashFlowForecast.push({
        date: targetDate.toISOString(),
        amount: Number(dailyAmount.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
      });
    }

    const totalUpcomingMonth = cashFlowForecast.reduce(
      (acc, point) => acc + point.amount,
      0,
    );

    const monthlyTrend = Array.from(trendMap.entries()).map(
      ([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2)),
      }),
    );

    return {
      preferredCurrencyCode,
      monthlyBurnRate,
      yearlyForecast: monthlyBurnRate * 12,
      remainingThisMonth,
      activeSubscriptionsTotal: subscriptions.length,
      activeSubscriptionsAuto,
      activeSubscriptionsManual,
      mostExpensiveSubscription,
      cashFlowForecast,
      upcomingRenewals,
      totalUpcomingMonth,
      monthlyTrend,
    };
  }
}
