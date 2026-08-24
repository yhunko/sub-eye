import { beforeEach, describe, expect, it } from "bun:test";
import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/model";
import type { SubscriptionRecord } from "@subeye/store";
import { QueryClient } from "@tanstack/react-query";
import { eraseDoc, localPorts } from "@/shared/lib/store";
import { makeSubscription } from "../model/subscription.fixture";
import {
  getCachedSubscriptionRow,
  subscriptionKeys,
  subscriptionsQuery,
} from "./list";

beforeEach(() => eraseDoc());

const record = (
  patch: Partial<SubscriptionRecord> & { id: string },
): SubscriptionRecord => ({
  name: "Netflix",
  cost: "9.99",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  status: "active",
  autoPaid: true,
  categoryId: null,
  notes: null,
  brandDomain: null,
  paymentDate: "2026-09-01T00:00:00.000Z",
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

const runList = (): Promise<SubscriptionDto[]> =>
  (subscriptionsQuery().queryFn as () => Promise<SubscriptionDto[]>)();

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
  it("maps stored records to the DTO every screen reads", async () => {
    await localPorts.subscriptions.create(record({ id: "s1" }));

    const rows = await runList();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("s1");
    expect(rows[0]?.name).toBe("Netflix");
    expect(rows[0]?.billing.preferred.amount).toBeGreaterThan(0);
  });

  // The defect this prevents: the server defaulted an absent status to "active"
  // (and its "active" meant active + cancelling), so the list arrived without
  // the paused and cancelled rows. Every screen treats this array as the whole
  // list, so the Paused and Cancelled chips were permanently empty and the
  // category counts were short. There is no status filter to forget any more —
  // this is the test that keeps one from being added.
  it("returns every status, not just the active ones", async () => {
    await localPorts.subscriptions.create(record({ id: "s1" }));
    await localPorts.subscriptions.create(
      record({
        id: "s2",
        status: "paused",
        pausedAt: "2026-08-01T00:00:00.000Z",
      }),
    );
    await localPorts.subscriptions.create(
      record({ id: "s3", status: "cancelled" }),
    );

    expect((await runList()).map((row) => row.id).sort()).toEqual([
      "s1",
      "s2",
      "s3",
    ]);
  });

  // The defect this prevents: the server paged at 50, and every screen treats
  // this array as the COMPLETE list — so a dropped page silently hid a user's
  // 51st subscription from the list, the search and the filters.
  it("returns the whole list, with no page boundary to fall off", async () => {
    for (let i = 0; i < 60; i++) {
      await localPorts.subscriptions.create(record({ id: `s${i}` }));
    }

    expect(await runList()).toHaveLength(60);
  });
});

describe("getCachedSubscriptionRow", () => {
  const row = makeSubscription();

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
