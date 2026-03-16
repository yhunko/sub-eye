import { describe, expect, it } from "bun:test";
import {
  DateTimezoneUtils,
  RecurrenceUtils,
  SubscriptionPeriod,
  type SubscriptionDto,
} from "shared";
import { TZDate } from "@date-fns/tz";
import { AnalyticsCalculator } from "../src/domains/analytics/analyticsCalculator";

const createMonthlySubscription = (paymentDate: string): SubscriptionDto => ({
  id: "sub_31st",
  userId: "user_01",
  name: "iCloud+",
  cost: 9.99,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate,
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  qstashMessageId: null,
  brandDomain: "icloud.com",
  billing: {
    original: {
      currencyCode: "usd",
      monthly: 9.99,
    },
    preferred: {
      currencyCode: "usd",
      amount: 9.99,
      monthly: 9.99,
      yearly: 119.88,
      exchangeRate: 1,
    },
  },
  nextPaymentDate: paymentDate,
  lastPaymentDate: null,
  willBeCancelledAt: null,
  scheduledPriceChange: null,
  status: "active",
});

describe("DateTimezoneUtils.shiftMonths", () => {
  it("clamps month-end dates instead of overflowing into next month", () => {
    const january31 = new Date("2025-01-31T12:00:00.000Z");
    const shifted = DateTimezoneUtils.shiftMonths(january31, 1, "UTC");

    expect(shifted.getUTCFullYear()).toBe(2025);
    expect(shifted.getUTCMonth()).toBe(1);
    expect(shifted.getUTCDate()).toBe(28);
    expect(shifted.getUTCHours()).toBe(12);
  });

  it("does not mutate the source date object", () => {
    const source = new Date("2025-01-31T12:00:00.000Z");

    DateTimezoneUtils.shiftMonths(source, 1, "UTC");

    expect(source.toISOString()).toBe("2025-01-31T12:00:00.000Z");
  });
});

describe("RecurrenceUtils timezone safety", () => {
  it("preserves timezone-aware date instances for monthly recurrence", () => {
    const start = new TZDate("2026-01-31T00:00:00.000+02:00", "Europe/Kiev");
    const relativeTo = new TZDate(
      "2026-02-01T00:00:00.000+02:00",
      "Europe/Kiev",
    );

    const next = RecurrenceUtils.getNextOccurrence(
      start,
      1,
      SubscriptionPeriod.MONTH,
      relativeTo,
    );

    expect(next).toBeInstanceOf(TZDate);
  });
});

describe("AnalyticsCalculator.buildMonthlyTrend", () => {
  it("includes February for subscriptions anchored on the 31st", () => {
    const trend = AnalyticsCalculator.buildMonthlyTrend(
      [createMonthlySubscription("2025-01-31T12:00:00.000Z")],
      new Date("2025-01-31T00:00:00.000Z"),
      3,
      "UTC",
    );

    expect(trend.map((point) => point.date)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
    ]);
    expect(trend.map((point) => point.amount)).toEqual([9.99, 9.99, 9.99]);
  });

  it("keeps February projection for timezone-shifted month-end anchors (real iCloud payload)", () => {
    const trend = AnalyticsCalculator.buildMonthlyTrend(
      [
        {
          id: "702a6247-6791-410f-9a0c-de0ac961950b",
          userId: "user_35yJSSLK75bNqDN4q0hqDalK69r",
          name: "iCloud+",
          cost: 2.99,
          currency: "usd",
          every: 1,
          period: SubscriptionPeriod.MONTH,
          paymentDate: "2026-01-30T22:00:00.000Z",
          autoPaid: false,
          categoryId: null,
          notes: null,
          createdAt: "2026-02-04T19:02:34.000Z",
          updatedAt: "2026-03-02T18:55:58.746Z",
          qstashMessageId: null,
          brandDomain: "icloud.com",
          billing: {
            original: {
              currencyCode: "usd",
              monthly: 2.99,
            },
            preferred: {
              currencyCode: "uah",
              amount: 131.30019734990532,
              monthly: 131.30019734990532,
              yearly: 1575.6023681988638,
              exchangeRate: 43.913109481573684,
            },
          },
          nextPaymentDate: "2026-03-30T21:00:00.000Z",
          lastPaymentDate: "2026-02-27T22:00:00.000Z",
          willBeCancelledAt: null,
          scheduledPriceChange: null,
          status: "active",
        },
      ],
      new Date("2026-01-31T00:00:00.000Z"),
      3,
      "Europe/Kiev",
    );

    expect(trend.map((point) => point.date)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    expect(trend.map((point) => point.amount)).toEqual([131.3, 131.3, 131.3]);
  });
});
