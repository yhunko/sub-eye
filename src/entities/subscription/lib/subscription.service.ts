import { SubscriptionRepository } from "../repository/subscription.repository";
import { SubscriptionMapper } from "./subscription.mapper";
import {
  SubscriptionDto,
  SubscriptionBillingDetails,
} from "../model/subscription.dtos";
import {
  AddSubscriptionParams,
  GetSubscriptionsParams,
} from "../model/subscription.params";
import { MonobankService } from "../../monobank/lib/monobank.service";
import { clerkClient } from "@clerk/nextjs/server";
import { SubscriptionSchema } from "@/shared/lib/db/schema";
import { MonobankCurrencyDto } from "../../monobank/model/dtos";
import { CurrencyUtils } from "../../monobank/lib/currency.utils";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  isPast,
  compareAsc,
  compareDesc,
} from "date-fns";
import { DateTimezoneUtils } from "@/shared/lib";
import { Period } from "@/shared/lib/db";

export class SubscriptionService {
  constructor(
    private repository = new SubscriptionRepository(),
    private monobankService = new MonobankService(),
  ) {}

  async getSubscriptionsForUser(
    userId: string,
    params?: GetSubscriptionsParams,
  ): Promise<SubscriptionDto[]> {
    const subscriptions = await this.repository.findByUserId(userId);
    const rates = await this.monobankService.getCurrencies();
    const { currency: preferredCurrency, timezone } =
      await this.getUserPreferences(userId);

    const dtos = subscriptions.map((subscription) =>
      this.toDto(subscription, preferredCurrency, rates, timezone),
    );

    return this.sortSubscriptions(dtos, params);
  }

  async addSubscription(
    params: AddSubscriptionParams,
    userId: string,
  ): Promise<SubscriptionSchema> {
    return await this.repository.create(params, userId);
  }

  async deleteAllForUser(userId: string): Promise<boolean> {
    await this.repository.deleteByUserId(userId);

    return true;
  }

  static calculateBillingDetails(
    subscription: SubscriptionSchema,
    preferredCurrency: number,
    rates: MonobankCurrencyDto[],
  ): SubscriptionBillingDetails {
    const cost = parseFloat(subscription.cost);

    const originalMonthly = CurrencyUtils.toMonthly(
      cost,
      subscription.every,
      subscription.period,
    );

    const convertedCost = CurrencyUtils.convert(
      cost,
      subscription.currency,
      preferredCurrency,
      rates,
    );

    const convertedMonthly = CurrencyUtils.convert(
      originalMonthly,
      subscription.currency,
      preferredCurrency,
      rates,
    );

    const effectiveRate = cost !== 0 ? convertedCost / cost : 1;

    return {
      original: {
        monthly: Number(originalMonthly.toFixed(2)),
      },
      preferred: {
        currencyCode: preferredCurrency,
        amount: Number(convertedCost.toFixed(2)),
        monthly: Number(convertedMonthly.toFixed(2)),
        exchangeRate: Number(effectiveRate.toFixed(4)),
      },
    };
  }

  private async getUserPreferences(
    userId: string,
  ): Promise<{ currency: number; timezone?: string }> {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const currency = Number(user.publicMetadata.preferredCurrency) || 980;
    const timezoneValue = user.publicMetadata.preferredTimezone;
    const timezone =
      typeof timezoneValue === "string" ? timezoneValue : undefined;

    return { currency, timezone };
  }

  private static calculateNextPaymentDate(
    subscription: SubscriptionSchema,
    timezone?: string,
  ): string {
    const now = DateTimezoneUtils.now(timezone);
    let current = DateTimezoneUtils.toZoned(subscription.paymentDate, timezone);

    while (isPast(current) && differenceInDays(now, current) > 0) {
      current = this.addPeriod(
        current,
        subscription.every,
        subscription.period,
      );
    }

    return current.toISOString();
  }

  private static addPeriod(date: Date, amount: number, period: Period): Date {
    switch (period) {
      case "day":
        return addDays(date, amount);
      case "week":
        return addWeeks(date, amount);
      case "month":
        return addMonths(date, amount);
      case "year":
        return addYears(date, amount);
      default:
        return date;
    }
  }

  private toDto(
    subscription: SubscriptionSchema,
    preferredCurrency: number,
    rates: MonobankCurrencyDto[],
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
    return SubscriptionMapper.toDto(subscription, billing, nextPaymentDate);
  }

  private sortSubscriptions(
    subscriptions: SubscriptionDto[],
    params?: GetSubscriptionsParams,
  ): SubscriptionDto[] {
    const sortBy = params?.sortBy ?? "nextPaymentDate";
    const direction = params?.direction ?? "asc";

    switch (sortBy) {
      case "nextPaymentDate": {
        return subscriptions.sort((a, b) => {
          const aDate = new Date(a.nextPaymentDate);
          const bDate = new Date(b.nextPaymentDate);
          return direction === "asc"
            ? compareAsc(aDate, bDate)
            : compareDesc(aDate, bDate);
        });
      }
      default: {
        return subscriptions;
      }
    }
  }
}
