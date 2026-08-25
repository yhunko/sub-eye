import type { PricePhaseDto, SubscriptionDto } from "@subeye/model";

/** The things a user can do to a subscription's price. */
export type PricingIntent =
  | "pending"
  | "schedule"
  | "trial"
  | "intro"
  | "endOffer";

/**
 * Which of them apply right now.
 *
 * The queued phase's own KIND separates the two conditional ones: a
 * `scheduledChange` waiting in the future is a price change the user can review,
 * apply early or drop, while a `standard` one is the reversion at the end of a
 * running offer — and applying THAT early is what "end the offer now" means.
 * Reading `effectivePhaseKind` instead would get both wrong the moment a
 * scheduled change is queued during a trial.
 *
 * The three that create a phase are always offered: they are the whole feature,
 * and an action that appears only sometimes reads as a bug.
 */
export function pricingIntentsFor(
  subscription: Pick<SubscriptionDto, "upcomingPhase"> | undefined,
): PricingIntent[] {
  const kind = subscription?.upcomingPhase?.kind;

  return [
    ...(kind === "scheduledChange" ? (["pending"] as const) : []),
    "schedule" as const,
    "trial" as const,
    "intro" as const,
    ...(kind === "standard" ? (["endOffer"] as const) : []),
  ];
}

/** The queued change itself, when there is one to act on. */
export function queuedPriceChange(
  subscription: Pick<SubscriptionDto, "upcomingPhase"> | undefined,
): PricePhaseDto | null {
  const upcoming = subscription?.upcomingPhase ?? null;
  return upcoming?.kind === "scheduledChange" ? upcoming : null;
}

/** The reversion that ends a running offer, when one is running. */
export function offerReversion(
  subscription: Pick<SubscriptionDto, "upcomingPhase"> | undefined,
): PricePhaseDto | null {
  const upcoming = subscription?.upcomingPhase ?? null;
  return upcoming?.kind === "standard" ? upcoming : null;
}
