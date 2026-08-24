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
  name: "Bolt+",
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
  // Ended: the state that gets asked for a restart date.
  willBeCancelledAt: "2026-03-27T00:00:00.000Z",
  status: "cancelled" as const,
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

describe("SubscriptionService.renewSubscription", () => {
  it("clears the cancellation", async () => {
    const { deps, updates } = buildDeps(base);

    const dto = await SubscriptionService.renewSubscription(
      "sub_1",
      "user_1",
      { paymentDate: null },
      deps as never,
    );

    expect(updates[0]?.willBeCancelledAt).toBeNull();
    expect(dto.willBeCancelledAt).toBeNull();
  });

  it("re-anchors the billing cycle to the given restart date", async () => {
    const { deps, updates } = buildDeps(base);

    await SubscriptionService.renewSubscription(
      "sub_1",
      "user_1",
      { paymentDate: "2026-07-20T00:00:00.000Z" },
      deps as never,
    );

    // The anchor is what every future occurrence is projected from. Left on the
    // old January date, a subscription restarted in July keeps billing on the
    // 5th — the day of a cycle the user is no longer on.
    expect(updates[0]?.paymentDate).toBe("2026-07-20T00:00:00.000Z");
  });

  it("leaves the anchor alone when no date is given", async () => {
    const { deps, updates } = buildDeps(base);

    await SubscriptionService.renewSubscription(
      "sub_1",
      "user_1",
      { paymentDate: null },
      deps as never,
    );

    // A `cancelling` subscription never stopped billing, so it is renewed
    // without a date — writing one here would shift a cycle that was never
    // interrupted. The key must be ABSENT, not null: a null would wipe the
    // column and strand the subscription with no anchor at all.
    expect(updates[0]).not.toHaveProperty("paymentDate");
  });

  it("clears the pause as well as the cancellation", async () => {
    // Reachable in two taps: a `paused` subscription is offered `cancel`, and a
    // cancelled one is offered `renew`.
    const { deps, updates } = buildDeps({
      ...base,
      pausedAt: "2026-06-01T00:00:00.000Z",
      resumeAt: null,
      status: "paused" as const,
    });

    const dto = await SubscriptionService.renewSubscription(
      "sub_1",
      "user_1",
      { paymentDate: "2026-07-20T00:00:00.000Z" },
      deps as never,
    );

    // Left set, `pausedAt` with no `resumeAt` puts the restarted subscription
    // straight back into an INDEFINITE pause: isOccurrencePaused then drops
    // every future occurrence, so it contributes nothing to the burn rate, the
    // forecast or the reminders while the badge reads Paused.
    expect(updates[0]?.pausedAt).toBeNull();
    expect(updates[0]?.resumeAt).toBeNull();
    expect(dto.status).toBe("active");
  });

  it("defaults to leaving the anchor alone when the payload is omitted", async () => {
    const { deps, updates } = buildDeps(base);

    await SubscriptionService.renewSubscription(
      "sub_1",
      "user_1",
      undefined,
      deps as never,
    );

    expect(updates[0]?.willBeCancelledAt).toBeNull();
    expect(updates[0]).not.toHaveProperty("paymentDate");
  });
});
