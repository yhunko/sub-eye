import type {
  SubscriptionBillingDetails,
  SubscriptionDto,
} from "@subeye/shared";
import { getSubscriptionLifecycleStatus } from "@subeye/shared";
import type { SubscriptionRecord } from "./subscriptionRepository";

export type SubscriptionPhaseProjection = {
  scheduledPriceChange: SubscriptionDto["scheduledPriceChange"];
  pricePhases: SubscriptionDto["pricePhases"];
  effectivePhaseKind: SubscriptionDto["effectivePhaseKind"];
  upcomingPhase: SubscriptionDto["upcomingPhase"];
};

export class SubscriptionMapper {
  static toDto(
    subscription: SubscriptionRecord,
    billing: SubscriptionBillingDetails,
    nextPaymentDate: string,
    lastPaymentDate: string | null,
    phases: SubscriptionPhaseProjection,
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
      scheduledPriceChange: phases.scheduledPriceChange,
      pricePhases: phases.pricePhases,
      effectivePhaseKind: phases.effectivePhaseKind,
      upcomingPhase: phases.upcomingPhase,
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
