import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { SubscriptionDto } from "@subeye/shared";
import { QueryClient } from "@tanstack/react-query";
import { makeSubscription } from "./subscription.fixture";

// See cache.test.ts — the builder reaches the transport through dashboardKeys.
process.env.EXPO_PUBLIC_API_URL = "https://api.test";
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";

const { buildOptimisticSubscriptionMutation } = await import(
  "./optimistic-mutation"
);
const { subscriptionKeys } = await import("../api/list");

const netflix = makeSubscription({ id: "a", name: "Netflix", cost: 100 });

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient();
  client.setQueryData(subscriptionKeys.detail("a"), netflix);
  client.setQueryData(subscriptionKeys.list(), [netflix]);
});

const detailCost = () =>
  client.getQueryData<SubscriptionDto>(subscriptionKeys.detail("a"))?.cost;
const listCost = () =>
  client.getQueryData<SubscriptionDto[]>(subscriptionKeys.list())?.[0]?.cost;

type CostVars = { id: string; cost: number };

const costMutation = (
  over: Partial<
    Parameters<typeof buildOptimisticSubscriptionMutation<CostVars>>[0]
  > = {},
) =>
  buildOptimisticSubscriptionMutation<CostVars>({
    client,
    subscriptionId: (vars) => vars.id,
    mutationFn: async () => null,
    patch: (vars) => ({ cost: vars.cost }),
    ...over,
  });

describe("buildOptimisticSubscriptionMutation", () => {
  it("applies the patch to both caches before the request leaves the device", async () => {
    await costMutation().onMutate?.({ id: "a", cost: 149 });

    expect(detailCost()).toBe(149);
    expect(listCost()).toBe(149);
  });

  it("ROLLS BACK to the exact previous cache when the mutation fails", async () => {
    const options = costMutation({
      mutationFn: async () => {
        throw new Error("network down");
      },
    });
    const vars = { id: "a", cost: 149 };

    const context = await options.onMutate?.(vars);
    expect(detailCost()).toBe(149); // the optimistic state was visible

    options.onError?.(new Error("network down"), vars, context);

    // Both shapes are back to the server truth — this is the whole point.
    expect(detailCost()).toBe(100);
    expect(listCost()).toBe(100);
  });

  it("cancels in-flight queries before patching, so a late refetch cannot clobber it", async () => {
    const cancelQueries = spyOn(client, "cancelQueries");

    await costMutation().onMutate?.({ id: "a", cost: 149 });

    const cancelled = cancelQueries.mock.calls.map(
      ([argument]) => (argument as { queryKey: readonly unknown[] }).queryKey,
    );
    expect(cancelled).toContainEqual(subscriptionKeys.detail("a"));
    expect(cancelled).toContainEqual(subscriptionKeys.list());
  });

  it("removes the row optimistically when configured as a delete", async () => {
    const options = buildOptimisticSubscriptionMutation<{ id: string }>({
      client,
      subscriptionId: (vars) => vars.id,
      mutationFn: async () => null,
      removes: true,
    });

    await options.onMutate?.({ id: "a" });

    expect(client.getQueryData(subscriptionKeys.list())).toEqual([]);
    expect(client.getQueryData(subscriptionKeys.detail("a"))).toBeUndefined();
  });

  it("overwrites the optimistic guess with the authoritative server row", () => {
    // The client cannot derive nextPaymentDate, pricePhases or allowedActions.
    // Whatever onMutate guessed has to lose to what the server actually returned.
    const server = makeSubscription({
      id: "a",
      name: "Netflix",
      cost: 149,
      nextPaymentDate: "2026-12-25T00:00:00.000Z",
      allowedActions: ["edit", "delete"],
    });

    costMutation().onSuccess?.(server, { id: "a", cost: 149 }, undefined, {
      id: "a",
      detail: netflix,
      list: [netflix],
    });

    expect(
      client.getQueryData<SubscriptionDto>(subscriptionKeys.detail("a")),
    ).toEqual(server);
    expect(
      client.getQueryData<SubscriptionDto[]>(subscriptionKeys.list())?.[0]
        ?.nextPaymentDate,
    ).toBe("2026-12-25T00:00:00.000Z");
  });

  it("reports the failure once the cache is already back to the truth", async () => {
    const seen: number[] = [];
    const options = costMutation({
      onFailure: () => seen.push(detailCost() ?? 0),
    });

    const vars = { id: "a", cost: 149 };
    const context = await options.onMutate?.(vars);
    options.onError?.(new Error("nope"), vars, context);

    // Ordering matters: the user must never be told "that failed" while the
    // screen is still showing the value that failed to save.
    expect(seen).toEqual([100]);
  });
});
