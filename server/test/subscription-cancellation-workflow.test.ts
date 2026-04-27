import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "shared";
import { SubscriptionCancellationWorkflow } from "../src/domains/subscription/subscriptionCancellationWorkflow";
import type { SubscriptionRecord } from "../src/domains/subscription/subscriptionRepository";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

const createSubscription = (
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord =>
  ({
    id: "sub_1",
    userId: "user_1",
    name: "Notion",
    cost: "12.00",
    scheduledCost: null,
    currency: "usd",
    scheduledCurrency: null,
    every: 1,
    period: SubscriptionPeriod.MONTH,
    autoPaid: true,
    categoryId: null,
    notes: null,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    qstashMessageId: null,
    cancellationQstashMessageId: null,
    priceChangeQstashMessageId: null,
    brandDomain: null,
    paymentDate: "2026-03-15T00:00:00.000Z",
    scheduledEffectiveAt: null,
    willBeCancelledAt: "2099-03-20T00:00:00.000Z",
    orgId: null,
    ...overrides,
  }) as SubscriptionRecord;

describe("SubscriptionCancellationWorkflow.buildNotifyAt", () => {
  it("applies notification time in timezone", () => {
    const notifyAt = (
      SubscriptionCancellationWorkflow as unknown as {
        buildNotifyAt: (
          cancellationDate: string,
          interval: number,
          timezone: string,
          notificationTime: string,
        ) => Date;
      }
    ).buildNotifyAt("2026-04-30T00:00:00.000Z", 1, "Europe/Kyiv", "10:00");

    expect(Date.parse(notifyAt.toISOString())).toBe(
      Date.parse("2026-04-29T07:00:00.000Z"),
    );
  });
});

describe("SubscriptionService.shouldScheduleCancellationWorkflow", () => {
  it("returns true for future cancellation dates", () => {
    const shouldSchedule = (
      SubscriptionService as unknown as {
        shouldScheduleCancellationWorkflow: (
          subscription: SubscriptionRecord,
        ) => boolean;
      }
    ).shouldScheduleCancellationWorkflow(
      createSubscription({
        willBeCancelledAt: "2099-03-20T00:00:00.000Z",
      }),
    );

    expect(shouldSchedule).toBe(true);
  });

  it("returns false when cancellation date is missing", () => {
    const shouldSchedule = (
      SubscriptionService as unknown as {
        shouldScheduleCancellationWorkflow: (
          subscription: SubscriptionRecord,
        ) => boolean;
      }
    ).shouldScheduleCancellationWorkflow(
      createSubscription({
        willBeCancelledAt: null,
      }),
    );

    expect(shouldSchedule).toBe(false);
  });
});
