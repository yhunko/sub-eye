import { SubscriptionRepository } from "../repository/subscription.repository";
import { SubscriptionMapper } from "./subscription.mapper";
import {
  SubscriptionDto,
  SubscriptionBillingDetails,
  SubscriptionMonthlySpendDto,
} from "../model/subscription.dtos";
import {
  AddSubscriptionParams,
  GetSubscriptionsParams,
} from "../model/subscription.params";
import { CurrencyService } from "../../currency/lib/currency.service";
import { clerkClient } from "@clerk/nextjs/server";
import { SubscriptionSchema } from "@/shared/lib/db/schema";
import {
  compareAsc,
  compareDesc,
  addMonths,
  endOfMonth,
  isAfter,
  startOfMonth,
} from "date-fns";
import { DateTimezoneUtils } from "@/shared/lib";
import { PushNotificationsSchedulerService } from "../../push-notifications/lib/push-notifications-scheduler.service";
import { RecurrenceUtils } from "@/shared/lib/recurrence.utils";
import { CurrencyUtils } from "@/shared/lib/currency.utils";

export class SubscriptionService {
  constructor(
    private repository = new SubscriptionRepository(),
    private currencyService = new CurrencyService(),
    private notificationScheduler = new PushNotificationsSchedulerService(),
  ) {}

  async getSubscriptionsForUser(
    userId: string,
    params?: GetSubscriptionsParams,
  ): Promise<SubscriptionDto[]> {
    const subscriptions = await this.repository.findByUserId(userId);
    const { currency: preferredCurrency, timezone } =
      await this.getUserPreferences(userId);

    const normalizedPreferredCurrency =
      CurrencyUtils.normalizeCode(preferredCurrency);

    const rates = await this.currencyService.getRates(
      normalizedPreferredCurrency,
    );

    const dtos = subscriptions.map((subscription) =>
      this.toDto(subscription, normalizedPreferredCurrency, rates, timezone),
    );

    const filtered = this.filterSubscriptions(dtos, params?.search);

    return this.sortSubscriptions(filtered, params);
  }

  async addSubscription(
    params: AddSubscriptionParams,
    userId: string,
  ): Promise<SubscriptionSchema> {
    const subscription = await this.repository.create(params, userId);

    // Schedule notification for new subscription
    await this.notificationScheduler.scheduleForSubscription(subscription);

    return subscription;
  }

  async deleteSubscription(id: string): Promise<void> {
    const subscription = await this.repository.findById(id);

    if (subscription) {
      await this.notificationScheduler.cancelForSubscription(subscription);
      await this.repository.delete(id);
    }
  }

  async updateSubscription(
    id: string,
    userId: string,
    params: Partial<AddSubscriptionParams>,
  ): Promise<SubscriptionDto> {
    const { currency: preferredCurrency, timezone } =
      await this.getUserPreferences(userId);

    const rates = await this.currencyService.getRates(preferredCurrency);

    const subscription = await this.repository.update(id, params);

    // Reschedule notification
    await this.notificationScheduler.rescheduleForSubscription(subscription);

    return this.toDto(subscription, preferredCurrency, rates, timezone);
  }

  async deleteAllForUser(userId: string): Promise<boolean> {
    await this.repository.deleteByUserId(userId);

    return true;
  }

  async getSubscriptionById(
    id: string,
    userId: string,
  ): Promise<SubscriptionDto> {
    const subscription = await this.repository.findById(id);

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.userId !== userId) {
      throw new Error("Unauthorized: Subscription does not belong to user");
    }

    const { currency: preferredCurrency, timezone } =
      await this.getUserPreferences(userId);

    const rates = await this.currencyService.getRates(preferredCurrency);

    return this.toDto(subscription, preferredCurrency, rates, timezone);
  }

  async getMonthlySpendSummary(
    userId: string,
  ): Promise<SubscriptionMonthlySpendDto> {
    const subscriptions = await this.repository.findByUserId(userId);
    const { currency: preferredCurrency, timezone } =
      await this.getUserPreferences(userId);

    const normalizedPreferredCurrency =
      CurrencyUtils.normalizeCode(preferredCurrency);
    const rates = await this.currencyService.getRates(
      normalizedPreferredCurrency,
    );

    const now = DateTimezoneUtils.now(timezone);
    const spendSources = subscriptions.map((subscription) => {
      const billing = SubscriptionService.calculateBillingDetails(
        subscription,
        normalizedPreferredCurrency,
        rates,
      );

      return {
        subscription,
        perPaymentAmount: billing.preferred.amount,
      };
    });

    const monthOffsets = [-4, -3, -2, -1, 0];
    const trend = monthOffsets.map((offset) => {
      const monthStart = startOfMonth(addMonths(now, offset));
      const monthEnd = endOfMonth(addMonths(now, offset));
      const total = spendSources.reduce(
        (sum, source) =>
          sum +
          SubscriptionService.calculateSpendForRange(
            source.subscription,
            source.perPaymentAmount,
            monthStart,
            monthEnd,
            timezone,
          ),
        0,
      );

      return {
        date: monthStart.toISOString(),
        amount: Number(total.toFixed(2)),
      };
    });

    const roundedCurrent =
      trend.find((_, index) => monthOffsets[index] === 0)?.amount ?? 0;
    const roundedPrevious =
      trend.find((_, index) => monthOffsets[index] === -1)?.amount ?? 0;
    const deltaPercentage =
      roundedPrevious > 0
        ? Number(
            (
              ((roundedCurrent - roundedPrevious) / roundedPrevious) *
              100
            ).toFixed(1),
          )
        : null;

    return {
      currencyCode: normalizedPreferredCurrency,
      currentMonthTotal: roundedCurrent,
      previousMonthTotal: roundedPrevious,
      deltaPercentage,
      trend,
    };
  }

  static calculateBillingDetails(
    subscription: SubscriptionSchema,
    preferredCurrency: string,
    rates: Record<string, number>,
  ): SubscriptionBillingDetails {
    const cost = parseFloat(subscription.cost);
    const subscriptionCurrency = CurrencyUtils.normalizeCode(
      subscription.currency,
    );

    const originalMonthly = CurrencyUtils.toMonthly(
      cost,
      subscription.every,
      subscription.period,
    );

    const convertedCost = CurrencyUtils.convert(
      cost,
      subscriptionCurrency,
      preferredCurrency,
      rates,
    );

    const convertedMonthly = CurrencyUtils.convert(
      originalMonthly,
      subscriptionCurrency,
      preferredCurrency,
      rates,
    );

    const effectiveRate = cost !== 0 ? convertedCost / cost : 1;

    return {
      original: {
        currencyCode: subscriptionCurrency,
        monthly: Number(originalMonthly.toFixed(2)),
      },
      preferred: {
        currencyCode: preferredCurrency,
        amount: Number(convertedCost.toFixed(2)),
        monthly: Number(convertedMonthly.toFixed(2)),
        yearly: Number((convertedMonthly * 12).toFixed(2)),
        exchangeRate: Number(effectiveRate.toFixed(4)),
      },
    };
  }

  private async getUserPreferences(
    userId: string,
  ): Promise<{ currency: string; timezone?: string }> {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const preferredCurrency = user.publicMetadata.preferredCurrency;
    const currency = CurrencyUtils.normalizeCode(preferredCurrency);

    const timezoneValue = user.publicMetadata.preferredTimezone;
    const timezone =
      typeof timezoneValue === "string" ? timezoneValue : undefined;

    return { currency, timezone };
  }

  private static calculatePreviousPaymentDate(
    subscription: SubscriptionSchema,
    timezone?: string,
  ): string | null {
    const now = DateTimezoneUtils.now(timezone);

    const startDateZoned = DateTimezoneUtils.toZoned(
      subscription.paymentDate,
      timezone,
    );

    const previousPayment = RecurrenceUtils.getPreviousOccurrence(
      startDateZoned,
      subscription.every,
      subscription.period,
      now,
    );

    return previousPayment ? previousPayment.toISOString() : null;
  }

  private static calculateNextPaymentDate(
    subscription: SubscriptionSchema,
    timezone?: string,
  ): string {
    const now = DateTimezoneUtils.now(timezone);

    const startDateZoned = DateTimezoneUtils.toZoned(
      subscription.paymentDate,
      timezone,
    );

    const nextPayment = RecurrenceUtils.getNextOccurrence(
      startDateZoned,
      subscription.every,
      subscription.period,
      now,
    );

    return nextPayment.toISOString();
  }

  private static calculateSpendForRange(
    subscription: SubscriptionSchema,
    perPaymentAmount: number,
    rangeStart: Date,
    rangeEnd: Date,
    timezone?: string,
  ): number {
    const startDateZoned = DateTimezoneUtils.toZoned(
      subscription.paymentDate,
      timezone,
    );

    let occurrence = RecurrenceUtils.getNextOccurrence(
      startDateZoned,
      subscription.every,
      subscription.period,
      rangeStart,
    );

    let total = 0;

    while (!isAfter(occurrence, rangeEnd)) {
      total += perPaymentAmount;
      occurrence = RecurrenceUtils.addPeriod(
        occurrence,
        subscription.every,
        subscription.period,
      );
    }

    return total;
  }

  private toDto(
    subscription: SubscriptionSchema,
    preferredCurrency: string,
    rates: Record<string, number>,
    timezone?: string,
  ): SubscriptionDto {
    const billing = SubscriptionService.calculateBillingDetails(
      subscription,
      preferredCurrency,
      rates,
    );
    const nextPaymentDate = SubscriptionService.calculateNextPaymentDate(
      subscription,
      timezone,
    );
    const previousPaymentDate =
      SubscriptionService.calculatePreviousPaymentDate(subscription, timezone);

    return SubscriptionMapper.toDto(
      subscription,
      billing,
      nextPaymentDate,
      previousPaymentDate,
    );
  }

  private sortSubscriptions(
    subscriptions: SubscriptionDto[],
    params?: GetSubscriptionsParams,
  ): SubscriptionDto[] {
    const sortBy = params?.sortBy ?? "nextPaymentDate";
    const direction = params?.direction ?? "asc";

    const sorted = structuredClone(subscriptions);

    switch (sortBy) {
      case "name": {
        return sorted.sort((a, b) =>
          direction === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name),
        );
      }
      case "cost": {
        return sorted.sort((a, b) => {
          const aAmount = a.billing.preferred.amount ?? 0;
          const bAmount = b.billing.preferred.amount ?? 0;
          return direction === "asc" ? aAmount - bAmount : bAmount - aAmount;
        });
      }
      case "nextPaymentDate": {
        return sorted.sort((a, b) => {
          const aDate = new Date(a.nextPaymentDate);
          const bDate = new Date(b.nextPaymentDate);
          return direction === "asc"
            ? compareAsc(aDate, bDate)
            : compareDesc(aDate, bDate);
        });
      }
      default: {
        return sorted;
      }
    }
  }

  private filterSubscriptions(
    subscriptions: SubscriptionDto[],
    search?: string,
  ): SubscriptionDto[] {
    const query = search?.trim().toLowerCase();

    if (!query) {
      return subscriptions;
    }

    return subscriptions.filter((subscription) =>
      subscription.name.toLowerCase().includes(query),
    );
  }
}
