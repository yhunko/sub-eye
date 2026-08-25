import type { PricePhaseDto, SubscriptionDto } from "@subeye/model";

/**
 * The things a user can do to a subscription's price.
 *
 * TWO of them create a phase, not three. "Free trial" and "intro discount" were
 * the same form with the price prefilled to zero — two menu entries, two
 * screens and one mechanic, which left the user choosing between things that
 * behave identically. `temporary` is that one mechanic; a price of 0 is free.
 */
export type PricingIntent = "pending" | "schedule" | "temporary" | "endOffer";

/**
 * Which of them apply right now.
 *
 * The queued phase's own KIND separates the two conditional ones. A `standard`
 * phase in front of us is the REVERSION at the end of a running offer, and
 * applying that early is what "end the offer now" means. Anything else waiting
 * in the future — a scheduled change, or a temporary price that has not opened
 * yet — is a change the user can review, apply early or drop.
 *
 * That "anything else" is not pedantry: a temporary price starting at the next
 * payment is itself pending, so restricting this to `scheduledChange` left an
 * offer the user had just scheduled with no way to inspect or cancel it.
 * Reading `effectivePhaseKind` instead would get both wrong the moment a
 * scheduled change is queued during a running offer.
 *
 * The two that create a phase are always offered: they are the whole feature,
 * and an action that appears only sometimes reads as a bug.
 */
export function pricingIntentsFor(
  subscription: Pick<SubscriptionDto, "upcomingPhase"> | undefined,
): PricingIntent[] {
  const kind = subscription?.upcomingPhase?.kind;

  return [
    ...(kind && kind !== "standard" ? (["pending"] as const) : []),
    "schedule" as const,
    "temporary" as const,
    ...(kind === "standard" ? (["endOffer"] as const) : []),
  ];
}

/**
 * The queued change itself, when there is one to act on — a scheduled change or
 * a temporary price that has not opened yet. Never the `standard` reversion,
 * which `offerReversion` claims.
 */
export function queuedPriceChange(
  subscription: Pick<SubscriptionDto, "upcomingPhase"> | undefined,
): PricePhaseDto | null {
  const upcoming = subscription?.upcomingPhase ?? null;
  if (!upcoming || upcoming.kind === "standard") return null;
  return upcoming;
}

/** The reversion that ends a running offer, when one is running. */
export function offerReversion(
  subscription: Pick<SubscriptionDto, "upcomingPhase"> | undefined,
): PricePhaseDto | null {
  const upcoming = subscription?.upcomingPhase ?? null;
  return upcoming?.kind === "standard" ? upcoming : null;
}
