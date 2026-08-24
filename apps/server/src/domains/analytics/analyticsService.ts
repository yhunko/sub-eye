import type {
  DashboardAnalyticsDto,
  MonthlySpendSummaryDto,
  WeeklyRenewalsSummaryDto,
} from "@subeye/model";
import { CurrencyUtils } from "@subeye/money";
import { AnalyticsCalculator } from "@subeye/spend";
import type { Ports } from "@subeye/store";
import { buildDashboard, buildMonthlySummary } from "@subeye/store";
import { DateTimezoneUtils } from "@subeye/time";
import { createPorts } from "../ports";
import { SubscriptionService } from "../subscription/subscriptionService";
import { UserService } from "../user/userService";

export class AnalyticsService {
  static async getDashboardStats(
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<DashboardAnalyticsDto> {
    return buildDashboard(ports);
  }

  static async getMonthlySpendSummary(
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<MonthlySpendSummaryDto> {
    return buildMonthlySummary(ports);
  }

  static async getWeeklyRenewalsSummary(
    userId: string,
  ): Promise<WeeklyRenewalsSummaryDto> {
    const [subscriptions, preferences] = await Promise.all([
      SubscriptionService.getSubscriptions(userId),
      UserService.getUserPreferences(userId),
    ]);
    const preferredCurrencyCode =
      subscriptions[0]?.billing.preferred.currencyCode ??
      CurrencyUtils.normalizeCode(preferences.preferredCurrency);

    // The user's timezone decides which week they are in; the bounds are then
    // calendar days, like the occurrences they bracket. Monday is found from the
    // UTC weekday — `date-fns` `startOfWeek` reads the HOST's, which lands on a
    // different instant for every server that is not itself on UTC.
    const today = DateTimezoneUtils.currentCalendarDay(
      new Date(),
      preferences.preferredTimezone,
    );
    const startOfCurrentWeek = DateTimezoneUtils.shiftCalendarDays(
      today,
      -((today.getUTCDay() + 6) % 7),
    );
    const endOfCurrentWeek = DateTimezoneUtils.endOfCalendarDay(
      DateTimezoneUtils.shiftCalendarDays(startOfCurrentWeek, 6),
    );

    const totalThisWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      startOfCurrentWeek,
      endOfCurrentWeek,
    );
    const totalUpcomingWeek = AnalyticsCalculator.sumSpendInRange(
      subscriptions,
      today,
      endOfCurrentWeek,
    );

    const trend = Array.from({ length: 7 }, (_, index) => {
      const dayStart = DateTimezoneUtils.shiftCalendarDays(
        startOfCurrentWeek,
        index,
      );
      const dailyTotal = AnalyticsCalculator.sumSpendInRange(
        subscriptions,
        dayStart,
        DateTimezoneUtils.endOfCalendarDay(dayStart),
      );
      return {
        date: dayStart.toISOString(),
        amount: Number(dailyTotal.toFixed(2)),
      };
    });

    return {
      currencyCode: preferredCurrencyCode,
      totalThisWeek: Number(totalThisWeek.toFixed(2)),
      totalUpcomingWeek: Number(totalUpcomingWeek.toFixed(2)),
      trend,
    };
  }
}
