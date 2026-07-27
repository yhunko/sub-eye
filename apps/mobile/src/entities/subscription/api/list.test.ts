import { afterEach, describe, expect, it } from "bun:test";
import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/shared";
import { QueryClient } from "@tanstack/react-query";

// The entity builds on the real apiClient, whose env module validates the
// EXPO_PUBLIC_* vars at import time — set them before the dynamic import below.
process.env.EXPO_PUBLIC_API_URL = "https://api.test";
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Stubs the transport rather than mocking the api module: bun's mock.module is
// process-global and would leak into client.test.ts, which asserts on the real
// client. This also exercises the real Hono RPC URL building.
function stubJson(body: unknown): string[] {
  const urls: string[] = [];
  globalThis.fetch = ((input: unknown) => {
    urls.push(input instanceof Request ? input.url : String(input));
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return urls;
}

/** Serves one body per call, so a paginated queryFn walks a real sequence. */
function stubPages(
  bodies: unknown[],
  { repeatLast = false }: { repeatLast?: boolean } = {},
): string[] {
  const urls: string[] = [];
  globalThis.fetch = ((input: unknown) => {
    const index = urls.length;
    urls.push(input instanceof Request ? input.url : String(input));
    const body = bodies[index] ?? (repeatLast ? bodies.at(-1) : undefined);
    return Promise.resolve(
      new Response(JSON.stringify(body ?? { items: [], nextCursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return urls;
}

const { getCachedSubscriptionRow, subscriptionKeys, subscriptionsQuery } =
  await import("./list");

const row: SubscriptionDto = {
  id: "sub_1",
  name: "Netflix",
  cost: 9.99,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-07-01T00:00:00.000Z",
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  brandDomain: "netflix.com",
  billing: {
    original: { currencyCode: "usd", monthly: 9.99 },
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
};

describe("subscriptionKeys", () => {
  // THE defect this whole task prevents: the web client's key embeds
  // {sortBy,direction,status,search}, so the loader's prefetch key never matches
  // the component's key (double fetch) and every keystroke mints a fresh key
  // (round-trip per character). A zero-argument key makes both impossible.
  it("takes no arguments — no sort, filter or search state in the key", () => {
    expect(subscriptionKeys.list()).toEqual(["subscriptions", "list"]);
    // Spread both: queryOptions() brands its queryKey with TanStack's dataTag
    // symbols, which will not compare against a plain tuple.
    expect([...subscriptionsQuery().queryKey]).toEqual([
      ...subscriptionKeys.list(),
    ]);
    // @ts-expect-error the list key must not accept parameters
    expect(subscriptionKeys.list({ search: "net" })).toEqual([
      "subscriptions",
      "list",
    ]);
  });

  it("nests detail under the same root so one invalidate covers both", () => {
    expect(subscriptionKeys.detail("sub_1")).toEqual([
      "subscriptions",
      "detail",
      "sub_1",
    ]);
    expect(subscriptionKeys.detail("sub_1").slice(0, 1)).toEqual([
      ...subscriptionKeys.all(),
    ]);
  });
});

describe("subscriptionsQuery", () => {
  // The screen renders an array; unwrapping the envelope here keeps every
  // consumer from repeating `.items`.
  it("unwraps the response envelope to a plain array", async () => {
    const urls = stubJson({ items: [row], nextCursor: null });
    const queryFn = subscriptionsQuery().queryFn as () => Promise<
      SubscriptionDto[]
    >;

    await expect(queryFn()).resolves.toEqual([row]);
    expect(urls[0]).toContain("/api/subscriptions");
  });

  // The defect this prevents: the server pages at 50 by default and every screen
  // treats this array as the COMPLETE list, so dropping nextCursor silently hides
  // a user's 51st subscription from the list, the search and the filters.
  it("follows nextCursor to exhaustion instead of returning the first page", async () => {
    const second = { ...row, id: "sub_2", name: "Spotify" };
    const urls = stubPages([
      { items: [row], nextCursor: "50" },
      { items: [second], nextCursor: null },
    ]);
    const queryFn = subscriptionsQuery().queryFn as () => Promise<
      SubscriptionDto[]
    >;

    await expect(queryFn()).resolves.toEqual([row, second]);
    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain("cursor=50");
  });

  // A server that keeps handing back the same cursor must not put the phone in
  // an unbounded request loop.
  it("stops after MAX_PAGES when the cursor never advances", async () => {
    const urls = stubPages([{ items: [row], nextCursor: "50" }], {
      repeatLast: true,
    });
    const queryFn = subscriptionsQuery().queryFn as () => Promise<
      SubscriptionDto[]
    >;

    await queryFn();
    expect(urls).toHaveLength(20);
  });
});

describe("getCachedSubscriptionRow", () => {
  // Cache seeding: the detail screen must be able to paint name/price/date the
  // instant the row is tapped, from data the list already holds.
  it("finds a row already held by the list query", () => {
    const client = new QueryClient();
    client.setQueryData(subscriptionKeys.list(), [row]);
    expect(getCachedSubscriptionRow(client, "sub_1")).toEqual(row);
  });

  it("returns undefined when the list cache is empty", () => {
    const client = new QueryClient();
    expect(getCachedSubscriptionRow(client, "sub_1")).toBeUndefined();
  });

  it("returns undefined for an id the list does not contain", () => {
    const client = new QueryClient();
    client.setQueryData(subscriptionKeys.list(), [row]);
    expect(getCachedSubscriptionRow(client, "sub_missing")).toBeUndefined();
  });
});
