import { describe, expect, it } from "bun:test";
import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/shared";
import {
  applySubscriptionFilters,
  DEFAULT_SUBSCRIPTION_FILTERS,
  type SubscriptionListFilters,
  subscriptionsDueOn,
} from "./filters";

function sub(
  overrides: Partial<SubscriptionDto> & { id: string },
): SubscriptionDto {
  return {
    name: "Thing",
    cost: 10,
    currency: "usd",
    every: 1,
    period: SubscriptionPeriod.MONTH,
    paymentDate: "2026-07-01T00:00:00.000Z",
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
    nextPaymentDate: "2026-08-01T00:00:00.000Z",
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

const filters = (
  over: Partial<SubscriptionListFilters> = {},
): SubscriptionListFilters => ({ ...DEFAULT_SUBSCRIPTION_FILTERS, ...over });

const netflix = sub({
  id: "1",
  name: "Netflix",
  nextPaymentDate: "2026-08-10T00:00:00.000Z",
  cost: 15,
});
const spotify = sub({
  id: "2",
  name: "Spotify",
  nextPaymentDate: "2026-08-02T00:00:00.000Z",
  cost: 5,
  category: { id: "cat_music", name: "Music", emoji: "🎵" },
});
const paused = sub({
  id: "3",
  name: "Adobe",
  status: "paused",
  resumeAt: "2026-09-01T00:00:00.000Z",
  nextPaymentDate: "2026-09-01T00:00:00.000Z",
  cost: 60,
});
const all = [netflix, spotify, paused];

describe("applySubscriptionFilters — search", () => {
  // Substring, case-insensitive, over the already-cached array. Proving this works
  // locally is what justifies keeping `search` out of the query key entirely.
  it("matches a case-insensitive substring of the name", () => {
    expect(
      applySubscriptionFilters(all, filters({ search: "net" })).map(
        (s) => s.id,
      ),
    ).toEqual(["1"]);
    expect(
      applySubscriptionFilters(all, filters({ search: "SPOT" })).map(
        (s) => s.id,
      ),
    ).toEqual(["2"]);
  });

  it("also matches the category name so 'music' finds Spotify", () => {
    expect(
      applySubscriptionFilters(all, filters({ search: "music" })).map(
        (s) => s.id,
      ),
    ).toEqual(["2"]);
  });

  it("ignores surrounding whitespace and treats an empty query as no filter", () => {
    expect(
      applySubscriptionFilters(all, filters({ search: "  net  " })).map(
        (s) => s.id,
      ),
    ).toEqual(["1"]);
    // status: "all" pinned explicitly — this is about the search term, and the
    // default narrows to active on its own.
    expect(
      applySubscriptionFilters(all, filters({ search: "   ", status: "all" }))
        .length,
    ).toBe(3);
  });

  it("returns an empty array when nothing matches", () => {
    expect(applySubscriptionFilters(all, filters({ search: "zzz" }))).toEqual(
      [],
    );
  });
});

describe("applySubscriptionFilters — status and category", () => {
  // The list is what you are paying for. Everything else is a tap away in the
  // sheet, and `hasActiveFilters` reads the same object so the header dot stays
  // dark while this is in force.
  it("shows only active subscriptions by default", () => {
    expect(applySubscriptionFilters(all, filters()).map((s) => s.id)).toEqual([
      "2",
      "1",
    ]);
  });

  it("filters by exact status", () => {
    expect(
      applySubscriptionFilters(all, filters({ status: "paused" })).map(
        (s) => s.id,
      ),
    ).toEqual(["3"]);
  });

  it("'all' keeps every status", () => {
    expect(
      applySubscriptionFilters(all, filters({ status: "all" })).length,
    ).toBe(3);
  });

  it("filters by category id", () => {
    expect(
      applySubscriptionFilters(all, filters({ categoryId: "cat_music" })).map(
        (s) => s.id,
      ),
    ).toEqual(["2"]);
  });

  it("combines status and search", () => {
    expect(
      applySubscriptionFilters(
        all,
        filters({ status: "active", search: "o" }),
      ).map((s) => s.id),
    ).toEqual(["2"]);
  });
});

// status: "all" throughout — these pin the ordering, and the default status
// filter would quietly drop the paused row out of every expectation.
describe("applySubscriptionFilters — sort", () => {
  it("sorts by soonest next payment by default", () => {
    expect(
      applySubscriptionFilters(all, filters({ status: "all" })).map(
        (s) => s.id,
      ),
    ).toEqual(["2", "1", "3"]);
  });

  it("sorts by name A→Z", () => {
    expect(
      applySubscriptionFilters(
        all,
        filters({ sort: "name", status: "all" }),
      ).map((s) => s.name),
    ).toEqual(["Adobe", "Netflix", "Spotify"]);
  });

  // Most expensive first: the reason anyone sorts by cost is to find what to cut.
  it("sorts by monthly cost in the home currency, highest first", () => {
    const pricey = sub({
      id: "4",
      name: "Cloud",
      billing: {
        original: { currencyCode: "usd", monthly: 238 },
        preferred: {
          currencyCode: "uah",
          amount: 9999,
          monthly: 9999,
          yearly: 119988,
          exchangeRate: 42,
        },
      },
    });
    expect(
      applySubscriptionFilters(
        [netflix, pricey],
        filters({ sort: "cost" }),
      ).map((s) => s.id),
    ).toEqual(["4", "1"]);
  });

  // A stale render must never mutate the query cache's array in place.
  it("does not mutate the input array", () => {
    const input = [netflix, spotify];
    applySubscriptionFilters(input, filters({ sort: "name" }));
    expect(input.map((s) => s.id)).toEqual(["1", "2"]);
  });
});

describe("subscriptionsDueOn", () => {
  const due = (
    id: string,
    day: string,
    overrides: Partial<SubscriptionDto> = {},
  ) => sub({ id, nextPaymentDate: `${day}T00:00:00.000Z`, ...overrides });

  it("keeps only the subscriptions charging on that calendar day", () => {
    const items = [
      due("1", "2026-08-01"),
      due("2", "2026-08-02"),
      due("3", "2026-08-01"),
    ];
    expect(subscriptionsDueOn(items, "2026-08-01").map((s) => s.id)).toEqual([
      "1",
      "3",
    ]);
  });

  // The server still computes a nextPaymentDate for a dead subscription, so
  // without the status guard a cancelled row joins a day it will never charge.
  it("excludes anything that is not billing", () => {
    const items = [
      due("1", "2026-08-01", { status: "cancelled" }),
      due("2", "2026-08-01", { status: "paused" }),
      due("3", "2026-08-01"),
    ];
    expect(subscriptionsDueOn(items, "2026-08-01").map((s) => s.id)).toEqual([
      "3",
    ]);
  });

  it("returns nothing for a malformed day rather than throwing", () => {
    expect(subscriptionsDueOn([due("1", "2026-08-01")], "nonsense")).toEqual(
      [],
    );
  });
});
