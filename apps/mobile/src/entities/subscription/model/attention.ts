import type { SubscriptionDto } from "@subeye/shared";
import { todayAsDay } from "@/shared/lib/format";

/**
 * The events Home surfaces, in the order they matter when two land on the same
 * day: a price about to change costs money, a charge is money leaving, a resume
 * is a heads-up, an ending is an FYI.
 */
export const attentionKinds = [
  "trialEnds",
  "introEnds",
  "priceChange",
  "payment",
  "resumes",
  "ends",
] as const;

export type AttentionKind = (typeof attentionKinds)[number];

export type AttentionEvent = {
  /** `${subscriptionId}:${kind}` — one subscription can raise two events. */
  key: string;
  subscriptionId: string;
  name: string;
  brandDomain: string | null;
  kind: AttentionKind;
  date: string;
  /**
   * What the subscription costs when the event lands — the price taking over
   * for a phase change, the charge for a renewal, the price you stop paying for
   * an ending. Never null: a blank in a column of amounts reads as missing data,
   * not as "nothing to say".
   */
  amount: number;
  currencyCode: string;
};

const RANK: Record<AttentionKind, number> = {
  trialEnds: 0,
  introEnds: 1,
  priceChange: 2,
  payment: 3,
  resumes: 4,
  ends: 5,
};

/**
 * The next `limit` dated things, soonest first, however far out they sit.
 *
 * A COUNT, not a time window. A window is what collapses: a fortnight leaves an
 * account with three subscriptions showing one row, and a calendar month empties
 * itself on the 30th with a charge landing on the 1st. A fixed count gives the
 * card the same height every day, and the date on each row already says how far
 * away it is.
 *
 * Derived on the client from the subscriptions list the app already caches, not
 * fetched: every input is a field the list DTO carries, so a server endpoint for
 * this would be a second source of the same truth.
 *
 * `now` is a parameter for the same reason it is in `@subeye/pricing` — this has
 * to be testable at a fixed instant.
 */
export function deriveAttention(
  subscriptions: SubscriptionDto[],
  now: Date = new Date(),
  limit = 5,
): AttentionEvent[] {
  // Today as a DAY, not as an instant. Every date below is a calendar day, so
  // comparing them against `now.getTime()` retired an event the moment its UTC
  // midnight passed — a payment due today vanished from the rail at 03:00 in
  // Kyiv, and during the previous evening for anyone west of UTC.
  const from = todayAsDay(now);
  const events: AttentionEvent[] = [];

  const ahead = (iso: string | null): iso is string => {
    if (!iso) return false;
    const at = Date.parse(iso);
    return !Number.isNaN(at) && at >= from;
  };

  for (const subscription of subscriptions) {
    if (subscription.status === "cancelled") continue;

    const base = {
      subscriptionId: subscription.id,
      name: subscription.name,
      brandDomain: subscription.brandDomain,
    };

    // One field covers three events. `upcomingPhase.startsAt` is the instant the
    // next price takes over, so what is *ending* is whatever is effective now —
    // and a pending scheduledChange leaves `effectivePhaseKind` on "standard"
    // until its own window opens, which is exactly the price-change case.
    const upcoming = subscription.upcomingPhase;
    if (upcoming && ahead(upcoming.startsAt)) {
      const kind =
        subscription.effectivePhaseKind === "trial"
          ? "trialEnds"
          : subscription.effectivePhaseKind === "intro"
            ? "introEnds"
            : "priceChange";
      events.push({
        ...base,
        key: `${subscription.id}:${kind}`,
        kind,
        date: upcoming.startsAt,
        amount: upcoming.billing.preferred.amount,
        currencyCode: upcoming.billing.preferred.currencyCode,
      });
    }

    // NOT gated on `autoPaid`: nothing in the product sets it, so every
    // subscription would read as "pay this yourself". Gate it here again if a
    // form field for it ever lands.
    //
    // A paused subscription's `nextPaymentDate` is a charge the pause will
    // swallow, and a cancelling one's can sit past the day access ends — the
    // server drops both from its own projections (`shouldIncludeOccurrence`),
    // and advertising a charge that will never be taken is the same lie here.
    const cancelsFirst =
      subscription.willBeCancelledAt !== null &&
      Date.parse(subscription.nextPaymentDate) >=
        Date.parse(subscription.willBeCancelledAt);

    if (
      subscription.status !== "paused" &&
      !cancelsFirst &&
      ahead(subscription.nextPaymentDate)
    ) {
      events.push({
        ...base,
        key: `${subscription.id}:payment`,
        kind: "payment",
        date: subscription.nextPaymentDate,
        amount: subscription.billing.preferred.amount,
        currencyCode: subscription.billing.preferred.currencyCode,
      });
    }

    if (subscription.status === "paused" && ahead(subscription.resumeAt)) {
      events.push({
        ...base,
        key: `${subscription.id}:resumes`,
        kind: "resumes",
        date: subscription.resumeAt as string,
        amount: subscription.billing.preferred.amount,
        currencyCode: subscription.billing.preferred.currencyCode,
      });
    }

    if (
      subscription.status === "cancelling" &&
      ahead(subscription.willBeCancelledAt)
    ) {
      events.push({
        ...base,
        key: `${subscription.id}:ends`,
        kind: "ends",
        date: subscription.willBeCancelledAt as string,
        amount: subscription.billing.preferred.amount,
        currencyCode: subscription.billing.preferred.currencyCode,
      });
    }
  }

  return events
    .sort(
      (a, b) =>
        Date.parse(a.date) - Date.parse(b.date) || RANK[a.kind] - RANK[b.kind],
    )
    .slice(0, limit);
}
