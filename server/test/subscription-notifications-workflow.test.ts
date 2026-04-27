import { afterEach, describe, expect, it } from "bun:test";
import {
  DateTimezoneUtils,
  SubscriptionPeriod,
  type UserPreferences,
} from "shared";
import { SubscriptionNotificationsWorkflow } from "../src/domains/subscription/subscriptionNotificationsWorkflow";
import type { SubscriptionRecord } from "../src/domains/subscription/subscriptionRepository";

const originalNow = DateTimezoneUtils.now;

const createPreferences = (
  overrides: Partial<UserPreferences> = {},
): UserPreferences => ({
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  notificationTime: "10:00",
  notificationOffset: 1,
  locale: "en",
  ...overrides,
});

const createSubscription = (
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord =>
  ({
    id: "sub_1",
    userId: "user_1",
    name: "Apple Music",
    cost: "9.99",
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
    priceChangeQstashMessageId: null,
    brandDomain: "apple.com",
    paymentDate: "2026-03-07T00:00:00.000Z",
    scheduledEffectiveAt: null,
    willBeCancelledAt: null,
    orgId: null,
    ...overrides,
  }) as SubscriptionRecord;

afterEach(() => {
  (
    DateTimezoneUtils as unknown as {
      now: typeof DateTimezoneUtils.now;
    }
  ).now = originalNow;
});

describe("SubscriptionNotificationsWorkflow.calculateNotificationTime", () => {
  it("keeps the current occurrence when the reminder window is already open", () => {
    const now = new Date("2026-04-06T15:00:00.000Z");
    (
      DateTimezoneUtils as unknown as {
        now: typeof DateTimezoneUtils.now;
      }
    ).now = () => now;

    const result = (
      SubscriptionNotificationsWorkflow as any
    ).calculateNotificationTime(
      createSubscription({
        paymentDate: "2026-03-07T00:00:00.000Z",
      }),
      createPreferences(),
      "2026-04-07T00:00:00.000Z",
    ) as { notifyAt: Date; targetPaymentDate: string };

    expect(Date.parse(result.targetPaymentDate)).toBe(
      Date.parse("2026-04-07T00:00:00.000Z"),
    );
    expect(result.notifyAt.getTime()).toBe(now.getTime());
  });

  it("advances to the next cycle when the occurrence has already passed", () => {
    const now = new Date("2026-04-06T15:00:00.000Z");
    (
      DateTimezoneUtils as unknown as {
        now: typeof DateTimezoneUtils.now;
      }
    ).now = () => now;

    const result = (
      SubscriptionNotificationsWorkflow as any
    ).calculateNotificationTime(
      createSubscription({
        paymentDate: "2026-03-05T00:00:00.000Z",
      }),
      createPreferences(),
      "2026-04-05T00:00:00.000Z",
    ) as { notifyAt: Date; targetPaymentDate: string };

    expect(Date.parse(result.targetPaymentDate)).toBe(
      Date.parse("2026-05-05T00:00:00.000Z"),
    );
    expect(result.notifyAt.getTime()).toBe(
      Date.parse("2026-05-04T10:00:00.000Z"),
    );
  });

  it("ignores stale payload payment date and uses canonical subscription payment date", () => {
    const now = new Date("2026-04-27T08:00:00.000Z");
    (
      DateTimezoneUtils as unknown as {
        now: typeof DateTimezoneUtils.now;
      }
    ).now = () => now;

    const result = (
      SubscriptionNotificationsWorkflow as any
    ).calculateNotificationTime(
      createSubscription({
        paymentDate: "2026-04-30T00:00:00.000Z",
      }),
      createPreferences(),
      "2026-04-28T00:00:00.000Z",
    ) as { notifyAt: Date; targetPaymentDate: string };

    expect(Date.parse(result.targetPaymentDate)).toBe(
      Date.parse("2026-04-30T00:00:00.000Z"),
    );
    expect(result.notifyAt.getTime()).toBe(
      Date.parse("2026-04-29T10:00:00.000Z"),
    );
  });

  it("schedules one-day reminder at local time in UTC+3", () => {
    const now = new Date("2026-04-27T08:00:00.000Z");
    (
      DateTimezoneUtils as unknown as {
        now: typeof DateTimezoneUtils.now;
      }
    ).now = () => now;

    const result = (
      SubscriptionNotificationsWorkflow as any
    ).calculateNotificationTime(
      createSubscription({
        paymentDate: "2026-04-30T00:00:00.000Z",
      }),
      createPreferences({
        preferredTimezone: "Europe/Kyiv",
        notificationOffset: 1,
        notificationTime: "10:00",
      }),
      "2026-04-30T00:00:00.000Z",
    ) as { notifyAt: Date; targetPaymentDate: string };

    expect(Date.parse(result.targetPaymentDate)).toBe(
      Date.parse("2026-04-30T00:00:00.000Z"),
    );
    expect(result.notifyAt.getTime()).toBe(
      Date.parse("2026-04-29T07:00:00.000Z"),
    );
  });
});
