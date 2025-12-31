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

      if (isSameMonth(targetDate, today)) {
        remainingThisMonth += dailyAmount;
      }

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
      currencyCode: preferredCurrencyCode,
    };
  }
}
