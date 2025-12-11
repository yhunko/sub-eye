import { SubscriptionRepository } from "../repository/subscription.repository";
import { SubscriptionMapper } from "./subscription.mapper";
import {
  SubscriptionDto,
  SubscriptionBillingDetails,
} from "../model/subscription.dtos";
import { AddSubscriptionParams } from "../model/subscription.params";
import { MonobankService } from "../../monobank/lib/monobank.service";
import { clerkClient } from "@clerk/nextjs/server";
import { SubscriptionSchema } from "@/shared/lib/db/schema";
import { MonobankCurrencyDto } from "../../monobank/model/dtos";
import { CurrencyUtils } from "../../monobank/lib/currency.utils";

export class SubscriptionService {
  constructor(
    private repository = new SubscriptionRepository(),
    private monobankService = new MonobankService(),
  ) {}

  async getSubscriptionsForUser(userId: string): Promise<SubscriptionDto[]> {
    const subscriptions = await this.repository.findByUserId(userId);
    const rates = await this.monobankService.getCurrencies();
    const preferredCurrency = await this.getUserPreferredCurrency(userId);

    return subscriptions.map((subscription) =>
      this.toDto(subscription, preferredCurrency, rates),
    );
  }

  async addSubscription(
    params: AddSubscriptionParams,
    userId: string,
  ): Promise<SubscriptionSchema> {
    return await this.repository.create(params, userId);
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

  private async getUserPreferredCurrency(userId: string): Promise<number> {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return Number(user.publicMetadata.preferredCurrency) || 980;
  }

  private toDto(
    subscription: SubscriptionSchema,
    preferredCurrency: number,
    rates: MonobankCurrencyDto[],
  ): SubscriptionDto {
    const billing = SubscriptionService.calculateBillingDetails(
      subscription,
      preferredCurrency,
      rates,
    );
    return SubscriptionMapper.toDto(subscription, billing);
  }
}
