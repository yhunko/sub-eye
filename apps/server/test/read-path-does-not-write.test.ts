import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

const subscription = {
  id: "sub_1",
  userId: "user_1",
  name: "Netflix",
  cost: "15.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  brandDomain: null,
  paymentDate: "2026-07-01T00:00:00.000Z",
  willBeCancelledAt: null,
  status: "active" as const,
  pausedAt: null,
  resumeAt: null,
};

const preferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  locale: "en",
  notificationOffset: 0,
  notificationTime: "10:00",
};

describe("GET /subscriptions read path", () => {
  it("issues no writes: a due pending phase is left untouched by the list read", async () => {
    const writes: string[] = [];

    // A phase whose boundary passed an hour ago and has never been applied.
    const duePhase = {
      id: "phase_due",
      subscriptionId: "sub_1",
      userId: "user_1",
      kind: "standard" as const,
      cost: "20.00",
      currency: "usd",
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
      endsAt: null,
      appliedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const deps = {
      repository: {
        findByUserId: async () => [subscription],
        update: async () => {
          writes.push("subscriptions.update");
          return subscription;
        },
      },
      phaseRepository: {
        findBySubscriptionIds: async () => [duePhase],
        findBySubscriptionId: async () => [duePhase],
        findPendingBySubscriptionId: async () => [duePhase],
        applyBoundaryBatch: async () => {
          writes.push("phases.applyBoundaryBatch");
        },
      },
      currencyService: { getRates: async () => ({}) },
      userService: { getUserPreferences: async () => preferences },
      categoryRepository: { findByUserId: async () => [] },
    };

    await SubscriptionService.getSubscriptions("user_1", deps as never);

    // The whole point: a read must not mutate. If reconcilePhases is still on
    // this path it will call applyBoundaryBatch for the overdue phase.
    expect(writes).toEqual([]);
  });
});
