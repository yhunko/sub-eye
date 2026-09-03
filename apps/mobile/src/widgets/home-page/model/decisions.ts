import type { CalendarEventKind, SubscriptionDto } from "@subeye/model";
import { todayAsDay } from "@/shared/lib/format";

/**
 * The dated events where opening the app still changes the outcome.
 *
 * A SUBSET of the calendar's own kinds, aliased rather than restated, so a
 * seventh kind cannot come to mean one thing here and another there.
 *
 * `payment` is absent because the strip above already draws every charge left
 * this month, and a scheduled renewal is not a decision — it is the deal.
 * `ends` is absent because a cancellation is a decision the user has already
 * made; repeating it back to them is an FYI wearing an alarm's clothes, and the
 * card stops meaning anything the moment it fills with those.
 */
export type DecisionKind = Extract<
  CalendarEventKind,
  "trialEnds" | "introEnds" | "priceChange" | "resumes"
>;

export type Decision = {
  key: string;
  subscriptionId: string;
  name: string;
  brandDomain: string | null;
  kind: DecisionKind;
  /** The stored calendar day it lands on — a UTC midnight, like every date here. */
  date: string;
  /** What starts leaving the account that day. */
  amount: number;
  /**
   * What leaves today, when the event REPLACES a price already being paid.
   *
   * Null for a trial converting and for a pause resuming: nothing is being
   * replaced there, and a struck-through "₴0.00" reads as missing data rather
   * than as "this was free".
   */
  previousAmount: number | null;
  currencyCode: string;
};

/** Rows the card fills to before it stops taking on new days. */
export const DECISION_ROWS = 3;

// Ties on a day are broken by what it costs to ignore: a trial converting is a
// price you never agreed to, an intro ending and a rise are prices you did, and
// a resume is money you chose to restart.
const RANK: Record<DecisionKind, number> = {
  trialEnds: 0,
  introEnds: 1,
  priceChange: 2,
  resumes: 3,
};

const dayOf = (iso: string): string => iso.slice(0, 10);

/**
 * The soonest decisions — three-ish, cut on a day boundary and never inside one.
 *
 * The cap stops the card STARTING a new day once it already holds three rows; a
 * day it has started is always shown whole. Truncating inside a day is the one
 * failure this card must not have: five trials converting tomorrow, shown as
 * three, is a user who cancels three and is charged for the two the card decided
 * not to mention — on the screen whose whole promise is that nothing surprises
 * them. A card that is occasionally tall is a far cheaper problem than one that
 * is occasionally quiet.
 */
function capByDay(events: Decision[]): { shown: Decision[]; hidden: number } {
  const shown: Decision[] = [];
  let index = 0;

  while (index < events.length) {
    if (shown.length >= DECISION_ROWS) {
      return { shown, hidden: events.length - index };
    }

    const day = dayOf(events[index]?.date ?? "");
    let end = index;
    while (end < events.length && dayOf(events[end]?.date ?? "") === day) end++;

    shown.push(...events.slice(index, end));
    index = end;
  }

  return { shown, hidden: 0 };
}

/**
 * What still needs deciding, soonest first, off the subscription list the app
 * already caches.
 *
 * Every input is a field the list DTO carries — `upcomingPhase.startsAt`,
 * `resumeAt`, `status` — so this reshapes data rather than projecting
 * occurrences, and a store use-case for it would be a second source of the same
 * truth. `now` is a parameter for the same reason it is one in `@subeye/pricing`:
 * this has to be assertable at a fixed instant.
 */
export function buildDecisions(
  subscriptions: readonly SubscriptionDto[],
  now: Date = new Date(),
): { shown: Decision[]; hidden: number } {
  // Today as a DAY, not as an instant. Compared against `now.getTime()`, an
  // event retired the moment its UTC midnight passed — a trial converting today
  // vanished from the card at 03:00 in Kyiv, and the previous evening for
  // anyone west of UTC.
  const from = todayAsDay(now);
  const events: Decision[] = [];

  for (const subscription of subscriptions) {
    if (subscription.status === "cancelled") continue;

    // A winding-down subscription keeps charging until its last day, so its
    // trial really can convert first — but an event dated PAST that day is
    // money that will never leave, and this card may not raise an alarm about
    // it. `shouldIncludeOccurrence` makes the same cut for payments.
    const until =
      subscription.status === "cancelling" && subscription.willBeCancelledAt
        ? Date.parse(subscription.willBeCancelledAt)
        : null;

    const ahead = (iso: string | null): iso is string => {
      if (!iso) return false;
      const at = Date.parse(iso);
      if (Number.isNaN(at) || at < from) return false;
      return until === null || at < until;
    };

    const base = {
      subscriptionId: subscription.id,
      name: subscription.name,
      brandDomain: subscription.brandDomain,
    };

    // One field covers three events. `upcomingPhase.startsAt` is the instant the
    // next price takes over, so what is ENDING is whatever is effective now —
    // and a pending scheduledChange leaves `effectivePhaseKind` on "standard"
    // until its own window opens, which is exactly the price-rise case.
    const upcoming = subscription.upcomingPhase;
    if (upcoming && ahead(upcoming.startsAt)) {
      const kind =
        subscription.effectivePhaseKind === "trial"
          ? "trialEnds"
          : subscription.effectivePhaseKind === "intro"
            ? "introEnds"
            : "priceChange";
      const current = subscription.billing.preferred.amount;
      events.push({
        ...base,
        key: `${subscription.id}:${kind}`,
        kind,
        date: upcoming.startsAt,
        amount: upcoming.billing.preferred.amount,
        previousAmount: kind === "trialEnds" || current <= 0 ? null : current,
        currencyCode: upcoming.billing.preferred.currencyCode,
      });
    }

    if (subscription.status === "paused" && ahead(subscription.resumeAt)) {
      events.push({
        ...base,
        key: `${subscription.id}:resumes`,
        kind: "resumes",
        date: subscription.resumeAt as string,
        amount: subscription.billing.preferred.amount,
        previousAmount: null,
        currencyCode: subscription.billing.preferred.currencyCode,
      });
    }
  }

  events.sort(
    (a, b) =>
      Date.parse(a.date) - Date.parse(b.date) || RANK[a.kind] - RANK[b.kind],
  );

  return capByDay(events);
}
