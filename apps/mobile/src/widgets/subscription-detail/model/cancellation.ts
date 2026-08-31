import type { SubscriptionDto } from "@subeye/model";

export type CancellationInput = Pick<
  SubscriptionDto,
  "nextPaymentDate" | "willBeCancelledAt"
>;

/**
 * The charge that still lands before a cancellation takes effect, or null when
 * none does.
 *
 * "Cancelling" does NOT imply "never charged again", and the screen promises
 * money will not move — so this answers from the dates, not from the status.
 * An end-of-period cancel sets `willBeCancelledAt` TO the next payment date and
 * `shouldIncludeOccurrence` is a strict `<`, so that occurrence is never billed
 * and the honest answer is "no further charges". But `edit` can set the date
 * arbitrarily far out, and every occurrence strictly before it IS billed.
 *
 * Only the NEXT one is reported. There may be several on a monthly subscription
 * cancelled a year out, and "one more charge" would be a lie the caller cannot
 * detect — the date is the fact this can state without projecting occurrences.
 */
export function chargeBeforeCancellation(
  subscription: CancellationInput,
): string | null {
  if (!subscription.willBeCancelledAt) return null;

  const next = Date.parse(subscription.nextPaymentDate);
  const end = Date.parse(subscription.willBeCancelledAt);
  if (Number.isNaN(next) || Number.isNaN(end)) return null;

  return next < end ? subscription.nextPaymentDate : null;
}
