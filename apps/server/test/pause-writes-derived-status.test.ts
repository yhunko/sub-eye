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

// Pause used to write the literal `"paused"`. It now derives, like the other
// three lifecycle writes, so the column agrees with the status the DTO and
// `allowedActions` are built from. These are the two inputs where the two
// answers differ — both reachable through the API, neither offered by the UI.
describe("pauseSubscription derives the status column", () => {
  it("stores `cancelling` when the pause lands on a cancelling subscription", async () => {
    const { deps, updates } = buildDeps({
      ...base,
      willBeCancelledAt: new Date(Date.now() + 30 * 86_400_000),
      status: "cancelling" as const,
    });

    await SubscriptionService.pauseSubscription(
      "sub_1",
      "user_1",
      {},
      deps as never,
    );

    // The cancellation outranks the pause everywhere else, so a column reading
    // `paused` here would hide the row from `?status=cancelling`.
    expect(updates[0]?.status).toBe("cancelling");
  });

  it("stores `active` when the requested resume day has already arrived", async () => {
    // `resumeAt` is validated as an ISO date, not a FUTURE one, so today is a
    // legal request — and a pause that ends today is over before it started.
    const { deps, updates } = buildDeps(base);

    await SubscriptionService.pauseSubscription(
      "sub_1",
      "user_1",
      { resumeAt: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z` },
      deps as never,
    );

    expect(updates[0]?.status).toBe("active");
  });

  it("never touches the cancellation column", async () => {
    const { deps, updates } = buildDeps(base);

    await SubscriptionService.pauseSubscription(
      "sub_1",
      "user_1",
      {},
      deps as never,
    );

    // The key must be ABSENT. Present-and-null un-cancels the subscription,
    // and nothing else in the suite would notice.
    expect(updates[0]).not.toHaveProperty("willBeCancelledAt");
  });
});

describe("resumeSubscription never touches the cancellation column", () => {
  it("omits willBeCancelledAt from the update", async () => {
    const { deps, updates } = buildDeps({
      ...base,
      status: "paused" as const,
      pausedAt: "2026-02-01T00:00:00.000Z",
      resumeAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });

    await SubscriptionService.resumeSubscription(
      "sub_1",
      "user_1",
      deps as never,
    );

    expect(updates[0]).not.toHaveProperty("willBeCancelledAt");
  });
});
