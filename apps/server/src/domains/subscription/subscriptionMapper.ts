import type { PhaseProjection } from "@subeye/pricing";
import type {
  SubscriptionBillingDetails,
  SubscriptionDto,
} from "@subeye/shared";
import { deriveSubscriptionStatus, getAllowedActions } from "@subeye/shared";
import type { SubscriptionRecord } from "./subscriptionRepository";

/** @deprecated Alias kept so existing imports resolve; use `PhaseProjection`. */
export type SubscriptionPhaseProjection = PhaseProjection;

/** The category, embedded on the DTO so the client renders a chip without a second request. */
export type EmbeddedCategory = { id: string; name: string; emoji: string };

export class SubscriptionMapper {
  static toDto(
    subscription: SubscriptionRecord,
    billing: SubscriptionBillingDetails,
    nextPaymentDate: string,
    lastPaymentDate: string | null,
    phases: SubscriptionPhaseProjection,
    category: EmbeddedCategory | null,
  ): SubscriptionDto {
    const paymentDate = SubscriptionMapper.normalizeDate(
      subscription.paymentDate,
    );
    const willBeCancelledAt = subscription.willBeCancelledAt
      ? SubscriptionMapper.normalizeDate(subscription.willBeCancelledAt)
      : null;

    // Derived from the date columns on every read: the `status` column is a
    // materialized cache that the pause/cancel writes keep current, so a
    // pause whose `resume_at` has passed, or a `cancelling` row whose
    // `cancelled_at` has elapsed, still reads correctly in between.
    const status = deriveSubscriptionStatus({
      willBeCancelledAt,
      pausedAt: subscription.pausedAt,
      resumeAt: subscription.resumeAt,
    });

    return {
      id: subscription.id,
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
      brandDomain: subscription.brandDomain ?? null,
      billing,
      nextPaymentDate,
      lastPaymentDate,
      willBeCancelledAt,
      pausedAt: subscription.pausedAt ?? null,
      resumeAt: subscription.resumeAt ?? null,
      scheduledPriceChange: phases.scheduledPriceChange,
      pricePhases: phases.pricePhases,
      effectivePhaseKind: phases.effectivePhaseKind,
      upcomingPhase: phases.upcomingPhase,
      status,
      allowedActions: getAllowedActions({
        status,
        hasPendingPhase: phases.upcomingPhase !== null,
      }),
      category,
    };
  }

  private static normalizeDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }
}
