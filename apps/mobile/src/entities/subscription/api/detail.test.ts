import { beforeEach, describe, expect, it } from "bun:test";
import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/model";
import type { PricePhaseRecord, SubscriptionRecord } from "@subeye/store";
import { QueryClient } from "@tanstack/react-query";
import { eraseDoc, localPorts } from "@/shared/lib/store";
import { makeSubscription } from "../model/subscription.fixture";
import { subscriptionDetailQuery } from "./detail";
import { subscriptionKeys } from "./list";

beforeEach(() => eraseDoc());

const row = makeSubscription();

const record: SubscriptionRecord = {
  id: "sub_1",
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
};

const phase = (patch: Partial<PricePhaseRecord>): PricePhaseRecord => ({
  id: "p1",
  subscriptionId: "sub_1",
  kind: "standard",
  cost: "19.99",
  currency: "usd",
  startsAt: "2026-01-02T00:00:00.000Z",
  endsAt: null,
  appliedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

const runDetail = (id: string): Promise<SubscriptionDto> =>
  (
    subscriptionDetailQuery(new QueryClient(), id)
      .queryFn as () => Promise<SubscriptionDto>
  )();

describe("subscriptionDetailQuery", () => {
  it("reads the subscription out of the store", async () => {
    await localPorts.subscriptions.create(record);

    await expect(runDetail("sub_1")).resolves.toMatchObject({
      id: "sub_1",
      name: "Netflix",
    });
  });

  it("rejects for an id the store does not hold", async () => {
    await expect(runDetail("nope")).rejects.toThrow();
  });

  // WHY THE SCREEN ALWAYS RE-READS. This is the only read that writes: a phase
  // whose boundary has passed is settled here, and nowhere else for a
  // subscription the foreground sync has not reached. Serving the seed without
  // re-reading would leave a price change permanently unapplied.
  it("settles a phase boundary that has already passed", async () => {
    await localPorts.subscriptions.create(record);
    await localPorts.phases.replaceAll("sub_1", [
      phase({ startsAt: "2026-01-02T00:00:00.000Z" }),
    ]);

    const detail = await runDetail("sub_1");

    expect(detail.cost).toBe(19.99);
    expect((await localPorts.phases.all())[0]?.appliedAt).not.toBeNull();
  });

  it("leaves a phase that is not due yet alone", async () => {
    await localPorts.subscriptions.create(record);
    await localPorts.phases.replaceAll("sub_1", [
      phase({ startsAt: "2099-01-01T00:00:00.000Z" }),
    ]);

    const detail = await runDetail("sub_1");

    expect(detail.cost).toBe(9.99);
    expect((await localPorts.phases.all())[0]?.appliedAt).toBeNull();
  });

  // The seeding contract: the row the user tapped is already in the list cache,
  // and it is the SAME shape as the detail read (pricePhases and allowedActions
  // included), so the detail screen paints complete on frame one.
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

  it("always refetches on mount so due phases are applied", () => {
    const client = new QueryClient();
    client.setQueryData(subscriptionKeys.list(), [row]);

    expect(subscriptionDetailQuery(client, "sub_1").refetchOnMount).toBe(
      "always",
    );
  });
});
