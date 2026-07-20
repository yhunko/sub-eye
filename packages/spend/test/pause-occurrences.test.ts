import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { AnalyticsCalculator } from "../src/analyticsCalculator";

const billing = (monthly: number) => ({
  original: {
    amount: monthly,
    currencyCode: "usd",
    monthly,
    yearly: monthly * 12,
  },
  preferred: {
    amount: monthly,
    currencyCode: "usd",
    monthly,
    yearly: monthly * 12,
  },
});

// $10/month, anchored on the 5th.
const pausedSub = {
  id: "sub",
  name: "Sub",
  cost: 10,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-01-05T00:00:00.000Z",
  autoPaid: true,
  categoryId: null,
  category: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  brandDomain: null,
  billing: billing(10),
  nextPaymentDate: "2026-02-05T00:00:00.000Z",
  lastPaymentDate: null,
  willBeCancelledAt: null,
  scheduledPriceChange: null,
  pricePhases: [],
  effectivePhaseKind: "standard" as const,
  upcomingPhase: null,
  status: "paused" as const,
  // Paused on 1 January, resuming 1 March.
  pausedAt: "2026-01-01T00:00:00.000Z",
  resumeAt: "2026-03-01T00:00:00.000Z",
  allowedActions: [],
};

const month = (m: number) => ({
  start: new Date(Date.UTC(2026, m - 1, 1, 0, 0, 0)),
  end: new Date(Date.UTC(2026, m, 0, 23, 59, 59)),
});

describe("pause is applied per occurrence", () => {
  const cases: Array<{ name: string; month: number; expected: number }> = [
    {
      name: "January — inside the pause, contributes nothing",
      month: 1,
      expected: 0,
    },
    {
      name: "February — inside the pause, contributes nothing",
      month: 2,
      expected: 0,
    },
    {
      name: "March — the resume month, contributes the FULL amount",
      month: 3,
      expected: 10,
    },
    { name: "April — back to normal", month: 4, expected: 10 },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      const { start, end } = month(testCase.month);
      expect(
        AnalyticsCalculator.calculateSpendInRange(
          pausedSub as never,
          start,
          end,
          "UTC",
        ),
      ).toBe(testCase.expected);
    });
  }

  it("a full year of a 2-month pause is 10 charges, not 12", () => {
    const total = AnalyticsCalculator.calculateSpendInRange(
      pausedSub as never,
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 11, 31, 23, 59, 59)),
      "UTC",
    );
    // Occurrences on the 5th of Jan and Feb are skipped; Mar–Dec land.
    expect(total).toBe(100);
  });

  it("an indefinite pause contributes nothing after paused_at", () => {
    const total = AnalyticsCalculator.calculateSpendInRange(
      { ...pausedSub, resumeAt: null } as never,
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 11, 31, 23, 59, 59)),
      "UTC",
    );
    expect(total).toBe(0);
  });
});
