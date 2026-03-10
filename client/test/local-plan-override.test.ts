import { describe, expect, it } from "bun:test";
import {
  FREE_SUBSCRIPTION_HISTORY_LIMIT,
  getPlanFeaturesMap,
  type PlanUsage,
} from "shared";
import {
  applyPlanUsageOverride,
  applySubscriptionHistoryOverride,
} from "../src/shared/lib/billing/local-plan-override";

describe("local plan override helpers", () => {
  const baseUsage: PlanUsage = {
    planId: "free",
    features: getPlanFeaturesMap("free"),
    subscriptions: {
      current: 12,
      limit: 20,
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
  });

  it("maps usage to free when override is free", () => {
    const plusUsage: PlanUsage = {
      planId: "plus",
      features: getPlanFeaturesMap("plus"),
      subscriptions: {
        current: 12,
        limit: 50,
      },
    };

    const result = applyPlanUsageOverride(plusUsage, "free");

    expect(result.planId).toBe("free");
    expect(result.features.notificationSchedule).toBe(false);
    expect(result.features.telegramMessageTemplate).toBe(false);
    expect(result.subscriptions.current).toBe(12);
    expect(result.subscriptions.limit).toBe(20);
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
