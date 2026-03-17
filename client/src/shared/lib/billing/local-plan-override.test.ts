import { describe, expect, it } from "bun:test";
import {
  FREE_COMPARATOR_AI_MONTHLY_LIMIT,
  FREE_COMPARATOR_MONTHLY_LIMIT,
  FREE_SUBSCRIPTION_HISTORY_LIMIT,
  PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
  getPlanFeaturesMap,
  type PlanUsage,
} from "shared";
import {
  applyPlanUsageOverride,
  applySubscriptionHistoryOverride,
} from "./local-plan-override";

describe("local plan override helpers", () => {
  const baseUsage: PlanUsage = {
    planId: "free",
    features: getPlanFeaturesMap("free"),
    subscriptions: {
      current: 12,
      limit: 20,
    },
    comparatorComparisons: {
      current: 3,
      limit: FREE_COMPARATOR_MONTHLY_LIMIT,
      remaining: FREE_COMPARATOR_MONTHLY_LIMIT - 3,
      periodKey: "2026-03",
      resetsAt: "2026-04-01T00:00:00.000Z",
      isLimited: true,
    },
    aiInsights: {
      current: 2,
      limit: FREE_COMPARATOR_AI_MONTHLY_LIMIT,
      remaining: FREE_COMPARATOR_AI_MONTHLY_LIMIT - 2,
      periodKey: "2026-03",
      resetsAt: "2026-04-01T00:00:00.000Z",
      isLimited: true,
    },
  };

  it("keeps usage unchanged when override is not set", () => {
    const result = applyPlanUsageOverride(baseUsage, null);

    expect(result).toBe(baseUsage);
  });

  it("maps usage to plus when override is plus", () => {
    const result = applyPlanUsageOverride(baseUsage, "plus");

    expect(result.planId).toBe("plus");
    expect(result.features.notificationSchedule).toBe(true);
    expect(result.features.telegramMessageTemplate).toBe(true);
    expect(result.subscriptions.current).toBe(12);
    expect(result.subscriptions.limit).toBe(50);
    expect(result.comparatorComparisons.limit).toBeNull();
    expect(result.aiInsights.limit).toBe(PLUS_COMPARATOR_AI_MONTHLY_LIMIT);
  });

  it("maps usage to free when override is free", () => {
    const plusUsage: PlanUsage = {
      planId: "plus",
      features: getPlanFeaturesMap("plus"),
      subscriptions: {
        current: 12,
        limit: 50,
      },
      comparatorComparisons: {
        current: 7,
        limit: null,
        remaining: null,
        periodKey: "2026-03",
        resetsAt: "2026-04-01T00:00:00.000Z",
        isLimited: false,
      },
      aiInsights: {
        current: 16,
        limit: PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
        remaining: PLUS_COMPARATOR_AI_MONTHLY_LIMIT - 16,
        periodKey: "2026-03",
        resetsAt: "2026-04-01T00:00:00.000Z",
        isLimited: true,
      },
    };

    const result = applyPlanUsageOverride(plusUsage, "free");

    expect(result.planId).toBe("free");
    expect(result.features.notificationSchedule).toBe(false);
    expect(result.features.telegramMessageTemplate).toBe(false);
    expect(result.subscriptions.current).toBe(12);
    expect(result.subscriptions.limit).toBe(20);
    expect(result.comparatorComparisons.limit).toBe(
      FREE_COMPARATOR_MONTHLY_LIMIT,
    );
    expect(result.aiInsights.limit).toBe(FREE_COMPARATOR_AI_MONTHLY_LIMIT);
  });

  it("forces hasMore off for plus override", () => {
    const response = {
      history: ["a", "b", "c"],
      hasMore: true,
    };

    const result = applySubscriptionHistoryOverride(response, "plus");

    expect(result.history).toEqual(["a", "b", "c"]);
    expect(result.hasMore).toBe(false);
  });

  it("enforces free history cap for free override", () => {
    const response = {
      history: Array.from(
        { length: FREE_SUBSCRIPTION_HISTORY_LIMIT + 2 },
        (_, i) => `item-${i}`,
      ),
      hasMore: false,
    };

    const result = applySubscriptionHistoryOverride(response, "free");

    expect(result.history.length).toBe(FREE_SUBSCRIPTION_HISTORY_LIMIT);
    expect(result.hasMore).toBe(true);
  });

  it("keeps history response unchanged when override is not set", () => {
    const response = {
      history: ["a", "b", "c"],
      hasMore: false,
    };

    const result = applySubscriptionHistoryOverride(response, null);

    expect(result).toBe(response);
  });
});
