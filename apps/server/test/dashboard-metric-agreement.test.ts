import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { AnalyticsService } from "../src/domains/analytics/analyticsService";

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

const makeSub = (over: Record<string, unknown>) => ({
  id: "sub",
  name: "Sub",
  cost: 10,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: new Date(Date.now() - 86_400_000).toISOString(),
  autoPaid: true,
  categoryId: null,
  category: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  brandDomain: null,
  billing: billing(10),
  nextPaymentDate: new Date(Date.now() + 86_400_000).toISOString(),
  lastPaymentDate: null,
  willBeCancelledAt: null,
  scheduledPriceChange: null,
  pricePhases: [],
  effectivePhaseKind: "standard" as const,
  upcomingPhase: null,
  status: "active" as const,
  pausedAt: null,
  resumeAt: null,
  allowedActions: [],
  ...over,
});

const preferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  locale: "en",
  notificationOffset: 0,
  notificationTime: "10:00",
};

describe("AnalyticsService.getDashboardStats", () => {
  it("makes yearlyForecast an occurrence sum, so a sub that lapses mid-year contributes only the charges that land — not a full monthlyBurnRate * 12", async () => {
    // 'cancelling' still counts toward the run-rate ("what you are signed up for
    // per month"), but this sub lapses in ~40 days, so only the one occurrence
    // that lands before then belongs in the yearly total.
    const ending = makeSub({
      id: "ending",
      status: "cancelling",
      paymentDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      nextPaymentDate: new Date(Date.now() + 25 * 86_400_000).toISOString(),
      willBeCancelledAt: new Date(Date.now() + 40 * 86_400_000).toISOString(),
    });

    const deps = {
      subscriptionService: { getSubscriptions: async () => [ending] },
      userService: { getUserPreferences: async () => preferences },
      categoryService: { getCategories: async () => [] },
    };

    const stats = await AnalyticsService.getDashboardStats(
      "user_1",
      deps as never,
    );

    // The run-rate still counts a cancelling subscription in full.
    expect(stats.monthlyBurnRate).toBe(10);

    // yearlyForecast is now the sum of occurrences that actually land, so it is
    // strictly less than monthlyBurnRate * 12 once the sub lapses mid-year.
    // Before the fix it was monthlyBurnRate * 12 exactly (120), which would
    // trip this bound.
    expect(stats.yearlyForecast).toBeGreaterThan(0);
    expect(stats.yearlyForecast).toBeLessThan(stats.monthlyBurnRate * 12);

    // remainingThisMonth is part of the yearly total and derives from the same
    // filtered set, so it can never exceed it.
    expect(stats.remainingThisMonth).toBeLessThanOrEqual(stats.yearlyForecast);
  });
});
