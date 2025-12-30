import { SubscriptionService } from "../../subscription/lib/subscription.service";
import {
  SubscriptionAnalyticsDto,
  CashFlowPoint,
} from "../model/analytics.dtos";
import {
  format,
  addDays,
  isSameDay,
  startOfDay,
  getDaysInMonth,
} from "date-fns";

export class AnalyticsService {
  constructor(private subscriptionService = new SubscriptionService()) {}

  async getDashboardStats(userId: string): Promise<SubscriptionAnalyticsDto> {
    const subscriptions =
      await this.subscriptionService.getSubscriptionsForUser(userId);

    // Get user's preferred currency from the first sub (as service already converted them)
    // or fallback to UAH (980)
    const preferredCurrencyCode =
      subscriptions[0]?.billing.preferred.currencyCode ?? 980;

    const monthlyBurnRate = subscriptions.reduce(
      (acc, sub) => acc + sub.billing.preferred.monthly,
      0,
    );

    // Generate Cash Flow for next 30 days
    const cashFlowForecast: CashFlowPoint[] = [];
    let cumulative = 0;
    const today = startOfDay(new Date());
    const daysInMonth = getDaysInMonth(today);

    for (let i = 0; i < daysInMonth; i++) {
      const date = addDays(today, i);

      // Find subscriptions due on this specific date
      const dueToday = subscriptions.filter((sub) =>
        isSameDay(new Date(sub.nextPaymentDate), date),
      );

      const dailyAmount = dueToday.reduce(
        (acc, sub) => acc + sub.billing.preferred.amount,
        0,
      );
      cumulative += dailyAmount;

      cashFlowForecast.push({
        date: date.toISOString(),
        formattedDate: format(date, "MMM dd"),
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
      cashFlowForecast,
      totalUpcomingMonth,
    };
  }
}
