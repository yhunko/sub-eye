import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

const preferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  locale: "en",
  notificationOffset: 0,
  notificationTime: "10:00",
};

const base = {
  id: "sub_1",
  userId: "user_1",
  name: "Netflix",
  cost: "10.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  brandDomain: null,
  paymentDate: "2026-01-05T00:00:00.000Z",
  willBeCancelledAt: null,
  status: "active" as const,
  pausedAt: null,
  resumeAt: null,
};

function buildDeps(record: Record<string, unknown>) {
  const updates: Array<Record<string, unknown>> = [];
  const deps = {
    repository: {
      findById: async () => ({ ...record }),
      update: async (_id: string, data: Record<string, unknown>) => {
        updates.push(data);
        return { ...record, ...data };
      },
    },
    phaseRepository: { findBySubscriptionId: async () => [] },
    currencyService: { getRates: async () => ({}) },
    userService: { getUserPreferences: async () => preferences },
    categoryRepository: { findByUserId: async () => [] },
  };
  return { deps, updates };
}

// packages/model invariant 1: deriveSubscriptionStatus is what the lifecycle
// services write through. The column is the only thing findPageByUserId's
// `?status=` filter can see, so a mutation that skips it makes a cancelled
// subscription match `?status=active` and never match `?status=cancelled`.
describe("the lifecycle writes agree with deriveSubscriptionStatus", () => {
  it("cancelling at period end stores `cancelling`", async () => {
    const { deps, updates } = buildDeps(base);

    await SubscriptionService.cancelSubscription(
      "sub_1",
      "user_1",
      deps as never,
    );

    expect(updates[0]?.status).toBe("cancelling");
  });

  it("cancelling immediately stores `cancelled`", async () => {
    const { deps, updates } = buildDeps(base);

    await SubscriptionService.cancelSubscriptionImmediately(
      "sub_1",
      "user_1",
      deps as never,
    );

    expect(updates[0]?.status).toBe("cancelled");
  });

  it("cancelling a paused subscription stores the cancellation, not the pause", async () => {
    const { deps, updates } = buildDeps({
      ...base,
      status: "paused" as const,
      pausedAt: "2026-06-01T00:00:00.000Z",
    });

    await SubscriptionService.cancelSubscription(
      "sub_1",
      "user_1",
      deps as never,
    );

    expect(updates[0]?.status).toBe("cancelling");
  });

  it("renewing stores `active`", async () => {
    const { deps, updates } = buildDeps({
      ...base,
      status: "cancelled" as const,
      willBeCancelledAt: "2026-03-27T00:00:00.000Z",
    });

    await SubscriptionService.renewSubscription(
      "sub_1",
      "user_1",
      { paymentDate: null },
      deps as never,
    );

    expect(updates[0]?.status).toBe("active");
  });
});
