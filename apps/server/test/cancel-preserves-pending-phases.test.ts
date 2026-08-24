import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

const subscription = {
  id: "sub_1",
  userId: "user_1",
  name: "Netflix",
  cost: "0.00", // currently paying the trial price
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

describe("SubscriptionService cancel", () => {
  it("keeps the pending standard-reversion phase so renew restores the real price", async () => {
    const deleted: string[] = [];

    const pendingStandard = {
      id: "phase_standard",
      subscriptionId: "sub_1",
      userId: "user_1",
      kind: "standard" as const,
      cost: "12.00",
      currency: "usd",
      startsAt: new Date(Date.now() + 20 * 86_400_000).toISOString(),
      endsAt: null,
      appliedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const deps = {
      repository: {
        findById: async () => ({ ...subscription }),
        update: async (_id: string, data: Record<string, unknown>) => ({
          ...subscription,
          ...data,
        }),
      },
      phaseRepository: {
        findBySubscriptionId: async () => [pendingStandard],
        findPendingBySubscriptionId: async () => [pendingStandard],
        deletePendingBySubscriptionId: async (id: string) => {
          deleted.push(id);
        },
      },
      currencyService: { getRates: async () => ({}) },
      userService: { getUserPreferences: async () => preferences },
      categoryRepository: { findByUserId: async () => [] },
    };

    await SubscriptionService.cancelSubscription(
      "sub_1",
      "user_1",
      deps as never,
    );

    // Cancelling is not a reason to throw away the price the sub reverts to.
    // If this list is non-empty, un-cancelling strands the user on the trial
    // price permanently.
    expect(deleted).toEqual([]);
  });
});
