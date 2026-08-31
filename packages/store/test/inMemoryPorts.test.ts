import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import type {
  CategoryRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "../src";
import { inMemoryPorts } from "./inMemoryPorts";

const subscription: SubscriptionRecord = {
  id: "s1",
  name: "Netflix",
  cost: "15.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  status: "active",
  autoPaid: false,
  categoryId: "c1",
  notes: null,
  brandDomain: null,
  paymentDate: "2026-09-15T00:00:00.000Z",
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const category: CategoryRecord = {
  id: "c1",
  name: "Streaming",
  emoji: "📺",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const phase: PricePhaseRecord = {
  id: "p1",
  subscriptionId: "s1",
  kind: "scheduledChange",
  cost: "18.00",
  currency: "usd",
  startsAt: "2026-10-15T00:00:00.000Z",
  endsAt: null,
  appliedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// The harness stands in for Postgres in every use-case test from 8b onwards, so
// the two referential actions the schema declares have to be real here. A
// harness that keeps orphan rows makes a leaking use-case look correct.
describe("referential actions", () => {
  test("removing a subscription cascades to its phases", async () => {
    const ports = inMemoryPorts({
      subscriptions: [subscription],
      phases: [phase],
    });

    await ports.subscriptions.remove("s1");

    expect(ports.dump().phases).toEqual([]);
  });

  test("removing a category nulls the subscriptions that referenced it", async () => {
    const ports = inMemoryPorts({
      subscriptions: [subscription],
      categories: [category],
    });

    await ports.categories.remove("c1");

    expect(ports.dump().categories).toEqual([]);
    expect(ports.dump().subscriptions[0]?.categoryId).toBeNull();
  });
});

describe("applyBoundary", () => {
  test("stamps the phase, closes the preceding one, and reprices the subscription", async () => {
    const preceding: PricePhaseRecord = {
      ...phase,
      id: "p0",
      kind: "standard",
      cost: "15.00",
      startsAt: "2026-01-01T00:00:00.000Z",
    };
    const ports = inMemoryPorts({
      subscriptions: [subscription],
      phases: [preceding, phase],
    });

    await ports.phases.applyBoundary({
      subscriptionId: "s1",
      phaseId: "p1",
      precedingPhaseId: "p0",
      cost: "18.00",
      currency: "usd",
      appliedAt: "2026-10-15T09:00:00.000Z",
      startsAt: "2026-10-15T00:00:00.000Z",
    });

    const dumped = ports.dump();
    expect(dumped.phases.find((p) => p.id === "p1")?.appliedAt).toBe(
      "2026-10-15T09:00:00.000Z",
    );
    expect(dumped.phases.find((p) => p.id === "p0")?.endsAt).toBe(
      "2026-10-15T00:00:00.000Z",
    );
    expect(dumped.subscriptions[0]?.cost).toBe("18.00");
  });
});
