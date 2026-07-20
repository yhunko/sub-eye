import type { SubscriptionDto } from "@subeye/shared";
import * as m from "@/i18n/messages";

export type SubscriptionPresentationTone =
  | "active"
  | "trial"
  | "discount"
  | "scheduled"
  | "cancelling"
  | "cancelled";

export type SubscriptionPresentation = {
  tone: SubscriptionPresentationTone;
  label: string;
  /** Localized supporting line (e.g. "Trial ends Jun 30"), or null. */
  detail: string | null;
};

type GetSubscriptionPresentationOptions = {
  /** Formats an ISO date for the locale; omit to leave detail dates out. */
  formatDate?: (iso: string) => string;
};

/**
 * Derives an unambiguous, at-a-glance status for a subscription's *effective*
 * lifecycle + pricing state. Pure and reused across the overview, list, and
 * table so the wording stays consistent everywhere.
 */
export function getSubscriptionPresentation(
  subscription: SubscriptionDto,
  options: GetSubscriptionPresentationOptions = {},
): SubscriptionPresentation {
  const { formatDate } = options;
  const formatBoundary = (iso: string | null | undefined): string | null =>
    iso && formatDate ? formatDate(iso) : null;

  if (subscription.status === "cancelled") {
    return {
      tone: "cancelled",
      label: m.subscription_status_cancelled(),
      detail: null,
    };
  }

  if (subscription.status === "cancelledButActive") {
    const date = formatBoundary(subscription.willBeCancelledAt);
    return {
      tone: "cancelling",
      label: m.subscription_status_cancelling(),
      detail: date ? m.subscription_status_detail_activeUntil({ date }) : null,
    };
  }

  if (subscription.effectivePhaseKind === "trial") {
    const date = formatBoundary(subscription.upcomingPhase?.startsAt);
    return {
      tone: "trial",
      label: m.subscription_status_trial(),
      detail: date ? m.subscription_status_detail_trialEnds({ date }) : null,
    };
  }

  if (subscription.effectivePhaseKind === "intro") {
    const date = formatBoundary(subscription.upcomingPhase?.startsAt);
    return {
      tone: "discount",
      label: m.subscription_status_discounted(),
      detail: date ? m.subscription_status_detail_discountEnds({ date }) : null,
    };
  }

  if (subscription.upcomingPhase) {
    const date = formatBoundary(subscription.upcomingPhase.startsAt);
    return {
      tone: "scheduled",
      label: m.subscription_status_priceChangeScheduled(),
      detail: date ? m.subscription_status_detail_changeOn({ date }) : null,
    };
  }

  return {
    tone: "active",
    label: m.subscription_status_active(),
    detail: null,
  };
}
