import { describe, expect, it } from "bun:test";
import { BillingService } from "../src/domains/billing/billingService";

describe("BillingService.getUsage", () => {
  it("returns canonical usage payload for free plan", async () => {
    const usage = await BillingService.getUsage("user_1", {
      subscriptionRepository: {
        countByUserId: async () => 12,
      } as never,
      comparatorRepository: {
        findByUserAndPeriod: async () => ({
          id: 1,
          userId: "user_1",
          periodKey: "2026-03",
          comparisonsCount: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findAiUsageByUserAndPeriod: async () => ({
          id: 1,
          userId: "user_1",
          periodKey: "2026-03",
          analysesCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as never,
      userService: {
        getPlanId: async () => "free",
        getUserPreferences: async () => ({
          preferredCurrency: "usd",
          preferredTimezone: "UTC",
          notificationTime: "10:00",
          notificationOffset: 1,
          locale: "en",
        }),
      } as never,
    });

    expect(usage.planId).toBe("free");
    expect(usage.subscriptions.current).toBe(12);
    expect(usage.subscriptions.limit).toBe(20);
    expect(usage.comparatorComparisons.current).toBe(4);
    expect(usage.comparatorComparisons.limit).toBe(10);
    expect(usage.comparatorComparisons.remaining).toBe(6);
    expect(usage.comparatorAiInsights.current).toBe(3);
    expect(usage.comparatorAiInsights.limit).toBe(10);
    expect(usage.comparatorAiInsights.remaining).toBe(7);
  });

  it("returns unlimited compare usage and capped AI usage for plus plan", async () => {
    const usage = await BillingService.getUsage("user_1", {
      subscriptionRepository: {
        countByUserId: async () => 42,
      } as never,
      comparatorRepository: {
        findByUserAndPeriod: async () => ({
          id: 1,
          userId: "user_1",
          periodKey: "2026-03",
          comparisonsCount: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findAiUsageByUserAndPeriod: async () => ({
          id: 1,
          userId: "user_1",
          periodKey: "2026-03",
          analysesCount: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as never,
      userService: {
        getPlanId: async () => "plus",
        getUserPreferences: async () => ({
          preferredCurrency: "usd",
          preferredTimezone: "UTC",
          notificationTime: "10:00",
          notificationOffset: 1,
          locale: "en",
        }),
      } as never,
    });

    expect(usage.planId).toBe("plus");
    expect(usage.subscriptions.limit).toBe(50);
    expect(usage.comparatorComparisons.current).toBe(15);
    expect(usage.comparatorComparisons.limit).toBeNull();
    expect(usage.comparatorComparisons.remaining).toBeNull();
    expect(usage.comparatorComparisons.isLimited).toBe(false);
    expect(usage.comparatorAiInsights.current).toBe(30);
    expect(usage.comparatorAiInsights.limit).toBe(300);
    expect(usage.comparatorAiInsights.remaining).toBe(270);
  });
});
