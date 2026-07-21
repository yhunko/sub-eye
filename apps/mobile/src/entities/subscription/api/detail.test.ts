import { afterEach, describe, expect, it } from "bun:test";
import type { SubscriptionDto } from "@subeye/shared";
import { QueryClient } from "@tanstack/react-query";
import { makeSubscription } from "../model/subscription.fixture";

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

const { subscriptionDetailQuery } = await import("./detail");
const { subscriptionKeys } = await import("./list");

const row = makeSubscription();

describe("subscriptionDetailQuery", () => {
  it("requests the single-subscription route", async () => {
    const urls = stubJson(row);
    const options = subscriptionDetailQuery(new QueryClient(), "sub_1");
    const queryFn = options.queryFn as () => Promise<SubscriptionDto>;

    await expect(queryFn()).resolves.toEqual(row);
    expect(urls[0]).toContain("/api/subscriptions/sub_1");
  });

  // The seeding contract: the row the user tapped is already in the list cache,
  // and it is the SAME shape as the detail response (pricePhases and
  // allowedActions included), so the detail screen paints complete on frame one.
  it("seeds initialData from the row the list query already holds", () => {
    const client = new QueryClient();
    client.setQueryData(subscriptionKeys.list(), [row]);

    expect(subscriptionDetailQuery(client, "sub_1").initialData).toEqual(row);
  });

  it("leaves initialData undefined on a cold start", () => {
    const options = subscriptionDetailQuery(new QueryClient(), "sub_1");

    expect(options.initialData).toBeUndefined();
    // Without a seed there is nothing to paint, so the screen must be allowed to
    // show its loading state rather than rendering an empty subscription.
    expect(options.initialDataUpdatedAt).toBeUndefined();
  });

  it("always refetches on mount so due phases are applied server-side", () => {
    const client = new QueryClient();
    client.setQueryData(subscriptionKeys.list(), [row]);

    expect(subscriptionDetailQuery(client, "sub_1").refetchOnMount).toBe(
      "always",
    );
  });
});
