import type {
  SubscriptionBillingDetails,
  SubscriptionDto,
} from "@subeye/shared";
import { getSubscriptionLifecycleStatus } from "@subeye/shared";
import type { SubscriptionRecord } from "./subscriptionRepository";

export class SubscriptionMapper {
  static toDto(
    subscription: SubscriptionRecord,
    billing: SubscriptionBillingDetails,
    nextPaymentDate: string,
    lastPaymentDate: string | null,
    scheduledPriceChange: SubscriptionDto["scheduledPriceChange"],
  ): SubscriptionDto {
    const paymentDate = SubscriptionMapper.normalizeDate(
      subscription.paymentDate,
    );
    const willBeCancelledAt = subscription.willBeCancelledAt
      ? SubscriptionMapper.normalizeDate(subscription.willBeCancelledAt)
      : null;

    return {
      id: subscription.id,
      userId: subscription.userId,
      name: subscription.name,
      cost: Number(subscription.cost),
      currency: subscription.currency,
      every: subscription.every,
      period: subscription.period,
      paymentDate,
      autoPaid: subscription.autoPaid,
      categoryId: subscription.categoryId ?? null,
      notes: subscription.notes ?? null,
      createdAt: SubscriptionMapper.normalizeDate(subscription.createdAt),
      updatedAt: SubscriptionMapper.normalizeDate(subscription.updatedAt),
      qstashMessageId: subscription.qstashMessageId ?? null,
      brandDomain: subscription.brandDomain ?? null,
      billing,
      nextPaymentDate,
      lastPaymentDate,
      willBeCancelledAt,
      scheduledPriceChange,
      status: getSubscriptionLifecycleStatus({
        willBeCancelledAt,
      }),
    };
  }

  private static normalizeDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }
}
