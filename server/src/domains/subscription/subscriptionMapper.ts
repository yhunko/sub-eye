import type {
  SubscriptionBillingDetails,
  SubscriptionDto,
} from "@shared/domains/subscription/subscriptionSchemas";
import { getSubscriptionLifecycleStatus } from "@shared/domains/subscription";
import type { SubscriptionRecord } from "./subscriptionRepository";

export class SubscriptionMapper {
  static toDto(
    subscription: SubscriptionRecord,
    billing: SubscriptionBillingDetails,
    nextPaymentDate: string,
    lastPaymentDate: string | null,
  ): SubscriptionDto {
    const paymentDate = this.normalizeDate(subscription.paymentDate);
    const willBeCancelledAt = subscription.willBeCancelledAt
      ? this.normalizeDate(subscription.willBeCancelledAt)
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
      category: subscription.category ?? null,
      notes: subscription.notes ?? null,
      createdAt: this.normalizeDate(subscription.createdAt),
      updatedAt: this.normalizeDate(subscription.updatedAt),
      qstashMessageId: subscription.qstashMessageId ?? null,
      brandDomain: subscription.brandDomain ?? null,
      billing,
      nextPaymentDate,
      lastPaymentDate,
      willBeCancelledAt,
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
