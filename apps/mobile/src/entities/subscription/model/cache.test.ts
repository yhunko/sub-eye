import { beforeEach, describe, expect, it } from "bun:test";
import type { SubscriptionDto } from "@subeye/shared";
import { QueryClient } from "@tanstack/react-query";
import { makeSubscription } from "./subscription.fixture";

// cache.ts reaches dashboardKeys through the dashboard entity, which pulls in the
// apiClient — and shared/config/env validates the EXPO_PUBLIC_* vars at import
// time. Set them before the dynamic import below, exactly as the api tests do.
process.env.EXPO_PUBLIC_API_URL = "https://api.test";
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";

const {
  patchSubscriptionCaches,
  removeSubscriptionFromCaches,
  restoreSubscriptionCaches,
  snapshotSubscriptionCaches,
} = await import("./cache");
const { subscriptionKeys } = await import("../api/list");

const netflix = makeSubscription({ id: "a", name: "Netflix", cost: 100 });
const spotify = makeSubscription({ id: "b", name: "Spotify", cost: 50 });

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient();
  client.setQueryData(subscriptionKeys.detail("a"), netflix);
  client.setQueryData(subscriptionKeys.list(), [netflix, spotify]);
});

const list = () =>
  client.getQueryData<SubscriptionDto[]>(subscriptionKeys.list()) ?? [];
const detail = () =>
  client.getQueryData<SubscriptionDto>(subscriptionKeys.detail("a"));

describe("patchSubscriptionCaches", () => {
  it("patches the detail entry and the matching list row only", () => {
    patchSubscriptionCaches(client, "a", { cost: 149 });

    expect(detail()?.cost).toBe(149);
    expect(list()[0]?.cost).toBe(149);
    // The untouched sibling proves the patch is targeted, not a blanket rewrite.
    expect(list()[1]?.cost).toBe(50);
  });

  it("does nothing when the id is not cached", () => {
    patchSubscriptionCaches(client, "zzz", { cost: 1 });

    expect(list()[0]?.cost).toBe(100);
    expect(detail()?.cost).toBe(100);
  });

  it("leaves an absent detail entry absent rather than inventing one", () => {
    patchSubscriptionCaches(client, "b", { cost: 75 });

    expect(client.getQueryData(subscriptionKeys.detail("b"))).toBeUndefined();
    expect(list()[1]?.cost).toBe(75);
  });
});

describe("removeSubscriptionFromCaches", () => {
  it("drops the row from the list and forgets its detail entry", () => {
    removeSubscriptionFromCaches(client, "a");

    expect(list().map((item) => item.id)).toEqual(["b"]);
    expect(detail()).toBeUndefined();
  });
});

describe("restoreSubscriptionCaches", () => {
  it("restores the exact pre-patch cache", () => {
    const before = JSON.stringify(list());
    const snapshot = snapshotSubscriptionCaches(client, "a");

    patchSubscriptionCaches(client, "a", { cost: 999, name: "Wrong" });
    restoreSubscriptionCaches(client, snapshot);

    // A whole-structure compare, not a spot check — exactness is the property
    // rollback depends on.
    expect(JSON.stringify(list())).toBe(before);
    expect(detail()).toEqual(netflix);
  });

  it("restores a row that an optimistic delete removed", () => {
    const before = JSON.stringify(list());
    const snapshot = snapshotSubscriptionCaches(client, "a");

    removeSubscriptionFromCaches(client, "a");
    expect(list()).toHaveLength(1);

    restoreSubscriptionCaches(client, snapshot);

    expect(JSON.stringify(list())).toBe(before);
    expect(detail()).toEqual(netflix);
  });
});
