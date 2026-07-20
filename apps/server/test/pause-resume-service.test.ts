import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
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
  // anchored well in the past so the next occurrence must be rolled forward
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

describe("SubscriptionService.pauseSubscription", () => {
  it("stores status=paused, a paused_at of now, and the requested resume_at", async () => {
    const { deps, updates } = buildDeps(base);

    const dto = await SubscriptionService.pauseSubscription(
      "sub_1",
      "user_1",
      { resumeAt: "2026-10-01T00:00:00.000Z" },
      deps as never,
    );

    expect(updates).toHaveLength(1);
    expect(updates[0]?.status).toBe("paused");
    expect(updates[0]?.resumeAt).toBe("2026-10-01T00:00:00.000Z");
    expect(typeof updates[0]?.pausedAt).toBe("string");
    expect(dto.status).toBe("paused");
  });

  it("allows an indefinite pause with no resumeAt", async () => {
    const { deps, updates } = buildDeps(base);
    await SubscriptionService.pauseSubscription(
      "sub_1",
      "user_1",
      {},
      deps as never,
    );
    expect(updates[0]?.resumeAt).toBeNull();
  });

  it("refuses to pause a subscription that is already paused", async () => {
    const { deps } = buildDeps({
      ...base,
      status: "paused",
      pausedAt: "2026-06-01T00:00:00.000Z",
    });
    await expect(
      SubscriptionService.pauseSubscription(
        "sub_1",
        "user_1",
        {},
        deps as never,
      ),
    ).rejects.toThrow("Subscription is already paused");
  });
});

describe("SubscriptionService.resumeSubscription", () => {
  it("clears the pause and rolls payment_date forward to the next FUTURE occurrence", async () => {
    const { deps, updates } = buildDeps({
      ...base,
      status: "paused",
      pausedAt: "2026-02-01T00:00:00.000Z",
      resumeAt: "2026-03-01T00:00:00.000Z",
    });

    await SubscriptionService.resumeSubscription(
      "sub_1",
      "user_1",
      deps as never,
    );

    expect(updates).toHaveLength(1);
    expect(updates[0]?.status).toBe("active");
    expect(updates[0]?.pausedAt).toBeNull();
    expect(updates[0]?.resumeAt).toBeNull();

    // The anchor was 2026-01-05, long past. Resuming must move it forward or
    // the very next dashboard read shows an overdue charge that never happened.
    const rolled = Date.parse(updates[0]?.paymentDate as string);
    expect(rolled).toBeGreaterThan(Date.now());
  });

  it("refuses to resume a subscription that is not paused", async () => {
    const { deps } = buildDeps(base);
    await expect(
      SubscriptionService.resumeSubscription("sub_1", "user_1", deps as never),
    ).rejects.toThrow("Subscription is not paused");
  });
});
