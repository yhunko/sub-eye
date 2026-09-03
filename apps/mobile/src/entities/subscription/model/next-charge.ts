import type {
  SubscriptionBillingDetails,
  SubscriptionDto,
} from "@subeye/model";

/**
 * What the next charge will actually cost — not what the subscription costs now.
 *
 * `billing.preferred` is the price effective TODAY, and a trial or an intro
 * window that closes before the next payment date makes those two different
 * numbers. A row printing the first while naming the second's date says
 * "₴0.00, in 7 days" over a trial converting in two, which is the exact surprise
 * this app exists to prevent.
 *
 * The list has to work this out itself: `applyDuePhases` settles a due phase from
 * `getSubscription` and from nowhere else, deliberately — `listSubscriptions`
 * must never write — so a list row holds the un-settled record and the phase it
 * is about to move to, side by side.
 *
 * Dates only, no clock: both sides are stored calendar days, and the question is
 * whether one lands on or before the other rather than whether either has passed.
 */
export function nextChargeBilling(
  subscription: SubscriptionDto,
): SubscriptionBillingDetails["preferred"] {
  const upcoming = subscription.upcomingPhase;
  if (!upcoming) return subscription.billing.preferred;

  const starts = Date.parse(upcoming.startsAt);
  const charge = Date.parse(subscription.nextPaymentDate);
  if (Number.isNaN(starts) || Number.isNaN(charge)) {
    return subscription.billing.preferred;
  }

  // Inclusive: a phase starting ON the payment date is the price that payment is
  // taken at. `startsAt` is the instant the new price takes over, and the charge
  // is made under whatever is effective that day.
  return starts <= charge
    ? upcoming.billing.preferred
    : subscription.billing.preferred;
}
