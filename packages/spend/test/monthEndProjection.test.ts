import { describe, expect, it } from "bun:test";
import { TZDate } from "@date-fns/tz";
import {
  DateTimezoneUtils,
  RecurrenceUtils,
  type SubscriptionDto,
  SubscriptionPeriod,
} from "@subeye/shared";
import { AnalyticsCalculator } from "../src/analyticsCalculator";

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

describe("DateTimezoneUtils.shiftCalendarMonths", () => {
  it("clamps month-end dates instead of overflowing into next month", () => {
    const january31 = new Date("2025-01-31T00:00:00.000Z");
    const shifted = DateTimezoneUtils.shiftCalendarMonths(january31, 1);

    expect(shifted.toISOString()).toBe("2025-02-28T00:00:00.000Z");
  });

  it("does not mutate the source date object", () => {
    const source = new Date("2025-01-31T00:00:00.000Z");

    DateTimezoneUtils.shiftCalendarMonths(source, 1);

    expect(source.toISOString()).toBe("2025-01-31T00:00:00.000Z");
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

describe("AnalyticsCalculator — cancelled subscriptions", () => {
  it("calculateSpendInRange includes a payment from the month before cancellation", () => {
    // Started March 13, cancelled April 13 — the March payment must appear in analytics
    const subscription: SubscriptionDto = {
      ...createMonthlySubscription("2025-03-13T12:00:00.000Z"),
      willBeCancelledAt: "2025-04-13T12:00:00.000Z",
      status: "cancelled",
    };

    const total = AnalyticsCalculator.calculateSpendInRange(
      subscription,
      new Date("2025-03-01T00:00:00.000Z"),
      new Date("2025-03-31T23:59:59.999Z"),
      "UTC",
    );

    expect(total).toBeCloseTo(9.99);
  });

  it("calculateSpendInRange excludes the payment on the exact cancellation date", () => {
    // April 13 === willBeCancelledAt: shouldIncludeOccurrence uses strict < so it's excluded
    const subscription: SubscriptionDto = {
      ...createMonthlySubscription("2025-03-13T12:00:00.000Z"),
      willBeCancelledAt: "2025-04-13T12:00:00.000Z",
      status: "cancelled",
    };

    const total = AnalyticsCalculator.calculateSpendInRange(
      subscription,
      new Date("2025-04-01T00:00:00.000Z"),
      new Date("2025-04-30T23:59:59.999Z"),
      "UTC",
    );

    expect(total).toBe(0);
  });

  it("calculateSpendInRange includes payments from multiple months before cancellation", () => {
    // Subscription anchored Dec 13 — Jan and Feb payments should both be included
    const subscription: SubscriptionDto = {
      ...createMonthlySubscription("2024-12-13T12:00:00.000Z"),
      willBeCancelledAt: "2025-03-13T12:00:00.000Z",
      status: "cancelled",
    };

    const janTotal = AnalyticsCalculator.calculateSpendInRange(
      subscription,
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2025-01-31T23:59:59.999Z"),
      "UTC",
    );
    const febTotal = AnalyticsCalculator.calculateSpendInRange(
      subscription,
      new Date("2025-02-01T00:00:00.000Z"),
      new Date("2025-02-28T23:59:59.999Z"),
      "UTC",
    );

    expect(janTotal).toBeCloseTo(9.99);
    expect(febTotal).toBeCloseTo(9.99);
  });

  it("buildMonthlyTrend shows correct spend for months around cancellation", () => {
    const subscription: SubscriptionDto = {
      ...createMonthlySubscription("2025-03-13T12:00:00.000Z"),
      willBeCancelledAt: "2025-04-13T12:00:00.000Z",
      status: "cancelled",
    };

    const trend = AnalyticsCalculator.buildMonthlyTrend(
      [subscription],
      new Date("2025-03-01T00:00:00.000Z"),
      2,
      "UTC",
    );

    // March: payment on March 13 (< April 13) → included
    expect(trend[0].amount).toBeCloseTo(9.99);
    // April: payment on April 13 === willBeCancelledAt → excluded
    expect(trend[1].amount).toBe(0);
  });
});
