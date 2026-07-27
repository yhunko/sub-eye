import { describe, expect, it } from "bun:test";
import type { PricePhaseDto } from "@subeye/shared";
import { deriveAttention } from "./attention";
import { makeSubscription } from "./subscription.fixture";

const NOW = new Date("2026-07-01T00:00:00.000Z");
const inDays = (days: number) =>
  new Date(NOW.getTime() + days * 86_400_000).toISOString();

const phase = (overrides: Partial<PricePhaseDto> = {}): PricePhaseDto => ({
  id: "phase_1",
  kind: "standard",
  cost: 299,
  currency: "uah",
  startsAt: inDays(3),
  endsAt: null,
  isActive: false,
  billing: {
    original: { currencyCode: "uah", monthly: 299 },
    preferred: {
      currencyCode: "uah",
      amount: 299,
      monthly: 299,
      yearly: 3588,
      exchangeRate: 1,
    },
  },
  ...overrides,
});

describe("deriveAttention", () => {
  it("reports a trial converting, with the price it converts to", () => {
    const events = deriveAttention(
      [
        makeSubscription({
          effectivePhaseKind: "trial",
          upcomingPhase: phase(),
        }),
      ],
      NOW,
    );

    // The conversion outranks the renewal behind it on date order.
    expect(events.map((event) => event.kind)).toEqual(["trialEnds", "payment"]);
    // The figure shown is the phase's price, NOT the subscription's current
    // cost — the whole point of the event is that the two differ.
    expect(events[0]?.amount).toBe(299);
  });

  it("calls a pending change a price change, not an intro ending", () => {
    // A scheduledChange that has not opened yet leaves effectivePhaseKind on
    // "standard" (see @subeye/pricing) — reading the upcoming phase's own kind
    // here would label every trial conversion a price change.
    const events = deriveAttention(
      [
        makeSubscription({
          effectivePhaseKind: "standard",
          upcomingPhase: phase({ kind: "scheduledChange" }),
        }),
      ],
      NOW,
    );

    expect(events[0]?.kind).toBe("priceChange");
  });

  it("announces a charge whatever autoPaid says", () => {
    // Nothing in the product sets autoPaid, so the schema default (false) made
    // every single subscription read as "pay this yourself". Neither value may
    // change what the card shows until a form field for it exists.
    const soon = { nextPaymentDate: inDays(2) };

    expect(
      deriveAttention([makeSubscription({ ...soon, autoPaid: true })], NOW),
    ).toHaveLength(1);
    expect(
      deriveAttention([makeSubscription({ ...soon, autoPaid: false })], NOW),
    ).toHaveLength(1);
  });

  it("drops a charge the pause or the cancellation will swallow", () => {
    const soon = { nextPaymentDate: inDays(2) };

    // The pause eats it, and the server's own projections already exclude it.
    // The resume survives — that is the event worth knowing about.
    expect(
      deriveAttention(
        [
          makeSubscription({
            ...soon,
            status: "paused",
            pausedAt: inDays(-1),
            resumeAt: inDays(30),
          }),
        ],
        NOW,
      ).map((event) => event.kind),
    ).toEqual(["resumes"]);

    // Cancelling still bills up to the end date...
    expect(
      deriveAttention(
        [
          makeSubscription({
            ...soon,
            status: "cancelling",
            willBeCancelledAt: inDays(9),
          }),
        ],
        NOW,
      ).map((event) => event.kind),
    ).toEqual(["payment", "ends"]);

    // ...but a charge landing on or after it never happens.
    const ending = deriveAttention(
      [
        makeSubscription({
          nextPaymentDate: inDays(9),
          status: "cancelling",
          willBeCancelledAt: inDays(9),
        }),
      ],
      NOW,
    );

    expect(ending.map((event) => event.kind)).toEqual(["ends"]);
    // Every kind carries a price. A blank cell in a column of amounts reads as
    // a failed lookup, which is what shipping `null` here looked like.
    expect(ending[0]?.amount).toBe(100);
  });

  it("ignores what has already happened and what is already dead", () => {
    const events = deriveAttention(
      [
        makeSubscription({ id: "b", nextPaymentDate: inDays(-1) }),
        makeSubscription({
          id: "c",
          nextPaymentDate: inDays(3),
          status: "cancelled",
          effectivePhaseKind: "trial",
          upcomingPhase: phase(),
        }),
      ],
      NOW,
    );

    expect(events).toHaveLength(0);
  });

  it("fills to the cap from however far out it has to reach", () => {
    // A time window is what collapses: a fortnight would show this account one
    // row out of four, and a calendar month would empty itself on the 30th.
    const events = deriveAttention(
      [
        makeSubscription({ id: "a", nextPaymentDate: inDays(2) }),
        makeSubscription({ id: "b", nextPaymentDate: inDays(40) }),
        makeSubscription({ id: "c", nextPaymentDate: inDays(300) }),
      ],
      NOW,
    );

    expect(events.map((event) => event.subscriptionId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("never shows more than the cap, and takes the soonest", () => {
    const events = deriveAttention(
      Array.from({ length: 9 }, (_, index) =>
        makeSubscription({
          id: `sub_${index}`,
          // Descending, so a naive implementation that skipped the sort would
          // return the FURTHEST five.
          nextPaymentDate: inDays(9 - index),
        }),
      ),
      NOW,
    );

    expect(events).toHaveLength(5);
    expect(events.map((event) => event.subscriptionId)).toEqual([
      "sub_8",
      "sub_7",
      "sub_6",
      "sub_5",
      "sub_4",
    ]);
  });

  it("orders by date and lets one subscription raise two events", () => {
    const events = deriveAttention(
      [
        makeSubscription({
          id: "sub_far",
          status: "paused",
          pausedAt: inDays(-2),
          resumeAt: inDays(9),
        }),
        makeSubscription({
          id: "sub_two",
          nextPaymentDate: inDays(5),
          effectivePhaseKind: "intro",
          upcomingPhase: phase({ startsAt: inDays(1) }),
        }),
      ],
      NOW,
    );

    expect(events.map((event) => event.kind)).toEqual([
      "introEnds",
      "payment",
      "resumes",
    ]);
    expect(new Set(events.map((event) => event.key)).size).toBe(3);
  });
});
