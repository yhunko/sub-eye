import { describe, expect, it } from "bun:test";
import {
  type PricePhaseDto,
  type SubscriptionDto,
  SubscriptionPeriod,
} from "@subeye/model";
import { buildDecisions } from "./decisions";

// A DEVICE instant, built locally — `buildDecisions` dates its floor from the
// device's calendar day, so a `…Z` literal here would make every case below pass
// or fail on the host's offset. The events' own dates are STORED days, always
// UTC midnights. Same split `rail.test.ts` makes.
const NOW = new Date(2026, 8, 3, 12, 0);

const day = (date: number): string =>
  new Date(Date.UTC(2026, 8, date)).toISOString();

function phase(overrides: Partial<PricePhaseDto>): PricePhaseDto {
  return {
    id: "p1",
    kind: "standard",
    cost: 20,
    currency: "usd",
    startsAt: day(10),
    endsAt: null,
    isActive: false,
    billing: {
      original: { currencyCode: "usd", monthly: 20 },
      preferred: {
        currencyCode: "uah",
        amount: 840,
        monthly: 840,
        yearly: 10_080,
        exchangeRate: 42,
      },
    },
    ...overrides,
  };
}

function sub(
  overrides: Partial<SubscriptionDto> & { id: string },
): SubscriptionDto {
  return {
    name: "Thing",
    cost: 10,
    currency: "usd",
    every: 1,
    period: SubscriptionPeriod.MONTH,
    paymentDate: day(1),
    autoPaid: true,
    categoryId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    brandDomain: null,
    billing: {
      original: { currencyCode: "usd", monthly: 10 },
      preferred: {
        currencyCode: "uah",
        amount: 420,
        monthly: 420,
        yearly: 5040,
        exchangeRate: 42,
      },
    },
    nextPaymentDate: day(20),
    lastPaymentDate: null,
    willBeCancelledAt: null,
    scheduledPriceChange: null,
    pricePhases: [],
    effectivePhaseKind: "standard",
    upcomingPhase: null,
    status: "active",
    pausedAt: null,
    resumeAt: null,
    allowedActions: [],
    category: null,
    ...overrides,
  };
}

/** A trial converting on `date`, at the standard price. */
const trial = (id: string, date: number): SubscriptionDto =>
  sub({
    id,
    name: id,
    effectivePhaseKind: "trial",
    billing: {
      original: { currencyCode: "usd", monthly: 0 },
      preferred: {
        currencyCode: "uah",
        amount: 0,
        monthly: 0,
        yearly: 0,
        exchangeRate: 42,
      },
    },
    upcomingPhase: phase({ startsAt: day(date) }),
  });

describe("buildDecisions", () => {
  it("names the phase event off what is effective NOW, not off what replaces it", () => {
    // The upcoming phase is "standard" in all three cases; only the phase being
    // left tells a trial converting apart from a rise on a price already paid.
    const { shown } = buildDecisions(
      [
        trial("Notion", 5),
        sub({
          id: "Duolingo",
          effectivePhaseKind: "intro",
          upcomingPhase: phase({ startsAt: day(6) }),
        }),
        sub({
          id: "Adobe",
          effectivePhaseKind: "standard",
          upcomingPhase: phase({ startsAt: day(7) }),
        }),
      ],
      NOW,
    );

    expect(shown.map((event) => event.kind)).toEqual([
      "trialEnds",
      "introEnds",
      "priceChange",
    ]);
  });

  it("carries the price being replaced, and nothing for a trial", () => {
    const { shown } = buildDecisions(
      [
        trial("Notion", 5),
        sub({
          id: "Adobe",
          upcomingPhase: phase({ startsAt: day(6) }),
        }),
      ],
      NOW,
    );

    // A struck-through "₴0.00" under a converting trial reads as missing data,
    // not as "this was free" — so the row gets a caption instead.
    expect(shown[0]?.previousAmount).toBeNull();
    expect(shown[0]?.amount).toBe(840);
    expect(shown[1]?.previousAmount).toBe(420);
  });

  it("leaves charges and cancellations to the strip and the calendar", () => {
    // A renewal and a wind-down are both dated and both real; neither is a
    // decision, and a card that fills with them stops being read.
    const { shown } = buildDecisions(
      [
        sub({ id: "Fastmail", nextPaymentDate: day(4) }),
        sub({
          id: "Dropbox",
          status: "cancelling",
          willBeCancelledAt: day(9),
        }),
      ],
      NOW,
    );

    expect(shown).toEqual([]);
  });

  it("drops an event a cancellation lands before", () => {
    // The trial converts on the 12th, but access ends on the 9th — the charge
    // it warns about will never happen, and this card may not raise an alarm
    // about money that cannot leave.
    const { shown } = buildDecisions(
      [
        sub({
          ...trial("Netflix", 12),
          id: "Netflix",
          status: "cancelling",
          willBeCancelledAt: day(9),
        }),
      ],
      NOW,
    );

    expect(shown).toEqual([]);
  });

  it("keeps today's own event", () => {
    // Compared against the instant rather than the day, a trial converting today
    // disappears from the card at 03:00 in Kyiv — hours before it charges.
    const { shown } = buildDecisions([trial("Notion", 3)], NOW);

    expect(shown.map((event) => event.key)).toEqual(["Notion:trialEnds"]);
  });

  it("shows every event on a day it has started, past the cap", () => {
    // Five trials converting tomorrow, shown as three, is a user who cancels
    // three and is charged for the two the card chose not to mention.
    const { shown, hidden } = buildDecisions(
      [4, 4, 4, 4, 4].map((date, index) => trial(`Trial${index}`, date)),
      NOW,
    );

    expect(shown.length).toBe(5);
    expect(hidden).toBe(0);
  });

  it("stops at the next day boundary once it holds three rows", () => {
    const { shown, hidden } = buildDecisions(
      [
        trial("A", 4),
        trial("B", 5),
        trial("C", 6),
        trial("D", 7),
        trial("E", 8),
      ],
      NOW,
    );

    expect(shown.map((event) => event.name)).toEqual(["A", "B", "C"]);
    expect(hidden).toBe(2);
  });

  it("takes a whole day it reaches under the cap, however big", () => {
    // Two rows in hand and a day of four next: the day goes in whole rather than
    // contributing the one row that would fill the card.
    const { shown, hidden } = buildDecisions(
      [
        trial("A", 4),
        trial("B", 5),
        trial("C", 6),
        trial("D", 6),
        trial("E", 6),
        trial("F", 6),
        trial("G", 7),
      ],
      NOW,
    );

    expect(shown.length).toBe(6);
    expect(hidden).toBe(1);
  });

  it("orders a shared day by what it costs to ignore", () => {
    const { shown } = buildDecisions(
      [
        sub({
          id: "Adobe",
          name: "Adobe",
          upcomingPhase: phase({ startsAt: day(5) }),
        }),
        sub({
          id: "AppleOne",
          name: "AppleOne",
          status: "paused",
          resumeAt: day(5),
        }),
        trial("Notion", 5),
      ],
      NOW,
    );

    expect(shown.map((event) => event.name)).toEqual([
      "Notion",
      "Adobe",
      "AppleOne",
    ]);
  });

  it("raises a resume for a paused subscription and nothing for a live one", () => {
    const { shown } = buildDecisions(
      [
        sub({ id: "AppleOne", status: "paused", resumeAt: day(8) }),
        sub({ id: "Spotify", resumeAt: day(8) }),
      ],
      NOW,
    );

    expect(shown.map((event) => event.key)).toEqual(["AppleOne:resumes"]);
  });

  it("ignores an indefinite pause and a settled subscription", () => {
    const { shown } = buildDecisions(
      [
        sub({ id: "AppleOne", status: "paused", resumeAt: null }),
        sub({
          ...trial("Netflix", 5),
          id: "Netflix",
          status: "cancelled",
          willBeCancelledAt: day(1),
        }),
      ],
      NOW,
    );

    expect(shown).toEqual([]);
  });

  it("drops a phase change that has already taken effect", () => {
    const { shown } = buildDecisions([trial("Notion", 1)], NOW);

    expect(shown).toEqual([]);
  });
});
