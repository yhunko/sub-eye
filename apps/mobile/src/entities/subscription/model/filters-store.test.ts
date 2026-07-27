import { afterEach, describe, expect, it } from "bun:test";
import { DEFAULT_SUBSCRIPTION_FILTERS } from "./filters";
import { hasActiveFilters, subscriptionFilters } from "./filters-store";

afterEach(() => {
  subscriptionFilters.set({ ...DEFAULT_SUBSCRIPTION_FILTERS });
});

describe("subscriptionFilters", () => {
  // useSyncExternalStore re-reads the snapshot after every render and bails out
  // on Object.is equality. A getter that built a fresh object would never be
  // equal to itself and would loop until React throws.
  it("returns a stable reference until something writes", () => {
    const first = subscriptionFilters.get();
    expect(subscriptionFilters.get()).toBe(first);

    subscriptionFilters.set({ status: "paused" });
    expect(subscriptionFilters.get()).not.toBe(first);
  });

  it("patches one field without disturbing the others", () => {
    subscriptionFilters.set({ search: "net" });
    subscriptionFilters.set({ sort: "cost" });

    expect(subscriptionFilters.get()).toEqual({
      ...DEFAULT_SUBSCRIPTION_FILTERS,
      search: "net",
      sort: "cost",
    });
  });

  it("notifies subscribers on write and stops after unsubscribe", () => {
    let calls = 0;
    const unsubscribe = subscriptionFilters.subscribe(() => {
      calls += 1;
    });

    subscriptionFilters.set({ status: "cancelled" });
    expect(calls).toBe(1);

    unsubscribe();
    subscriptionFilters.set({ status: "active" });
    expect(calls).toBe(1);
  });

  // The native search bar owns its own text and this cannot clear it. Wiping
  // `search` here would leave the field showing a term that is no longer applied.
  it("resets every filter but keeps the search text", () => {
    subscriptionFilters.set({
      search: "net",
      status: "paused",
      categoryId: "cat_1",
      sort: "cost",
    });

    subscriptionFilters.reset();

    expect(subscriptionFilters.get()).toEqual({
      ...DEFAULT_SUBSCRIPTION_FILTERS,
      search: "net",
    });
  });
});

describe("hasActiveFilters", () => {
  it("is false for the defaults", () => {
    expect(hasActiveFilters(DEFAULT_SUBSCRIPTION_FILTERS)).toBe(false);
  });

  it.each([
    ["status", { status: "paused" as const }],
    ["category", { categoryId: "cat_1" }],
    ["sort", { sort: "cost" as const }],
  ])("is true when %s is narrowed", (_label, patch) => {
    expect(
      hasActiveFilters({ ...DEFAULT_SUBSCRIPTION_FILTERS, ...patch }),
    ).toBe(true);
  });

  // Search has its own visible affordance; lighting the filter button while the
  // user types would tell them nothing they cannot already see.
  it("ignores the search term", () => {
    expect(
      hasActiveFilters({ ...DEFAULT_SUBSCRIPTION_FILTERS, search: "netflix" }),
    ).toBe(false);
  });
});
