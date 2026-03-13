import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { SubscriptionPeriod } from "shared";
import { createComparatorRouter } from "../src/routes/comparator";

describe("comparator router", () => {
  it("returns 401 when middleware rejects request", async () => {
    const router = createComparatorRouter({
      protectMiddleware: (context) =>
        context.json({ error: "Unauthorized" }, 401),
    });
    const app = new Hono().route("/comparator", router);

    const response = await app.request("/comparator/quota");

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid compare payload", async () => {
    const router = createComparatorRouter({
      protectMiddleware: async (_context, next) => next(),
      getUserId: () => "user_1",
      service: {
        getQuota: async () => ({
          planId: "free",
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
          used: 0,
          limit: 10,
          remaining: 10,
          isLimited: true,
        }),
        getAiQuota: async () => ({
          planId: "free",
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
          used: 0,
          limit: 10,
          remaining: 10,
          isLimited: true,
        }),
        getRates: async () => ({
          baseCurrencyCode: "usd",
          rates: { usd: 1, eur: 0.92 },
        }),
        compare: async () => {
          throw new Error("should not reach compare");
        },
        analyze: async () => {
          throw new Error("should not reach analyze");
        },
      },
    });
    const app = new Hono().route("/comparator", router);

    const response = await app.request("/comparator/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invalid: true }),
    });

    expect(response.status).toBe(400);
  });

  it("maps known service errors to expected status codes", async () => {
    const router = createComparatorRouter({
      protectMiddleware: async (_context, next) => next(),
      getUserId: () => "user_1",
      service: {
        getQuota: async () => {
          throw new Error("Comparator quota exceeded");
        },
        getAiQuota: async () => ({
          planId: "free",
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
          used: 0,
          limit: 10,
          remaining: 10,
          isLimited: true,
        }),
        getRates: async () => ({
          baseCurrencyCode: "usd",
          rates: { usd: 1, eur: 0.92 },
        }),
        compare: async () => {
          throw new Error("Subscription not found");
        },
        analyze: async () => ({
          mode: "fallback",
          cacheHit: false,
          model: "gemini-2.5-flash-lite",
          compared: {
            preferredCurrencyCode: "usd",
            currentPlan: {
              source: "manual",
              subscriptionId: null,
              name: "Current",
              every: 1,
              period: SubscriptionPeriod.MONTH,
              currencyCode: "usd",
              immediateCharge: 10,
              monthlyAmount: 10,
              yearlyAmount: 120,
            },
            candidatePlan: {
              source: "manual",
              subscriptionId: null,
              name: "Candidate",
              every: 1,
              period: SubscriptionPeriod.MONTH,
              currencyCode: "usd",
              immediateCharge: 8,
              monthlyAmount: 8,
              yearlyAmount: 96,
            },
            delta: {
              monthlyDelta: -2,
              yearlyDelta: -24,
              monthlyPercent: -20,
              yearlyPercent: -20,
              direction: "save",
            },
            portfolioContext: {
              currentMonthlyTotal: 45,
              currentYearlyTotal: 540,
              projectedMonthlyTotal: 43,
              projectedYearlyTotal: 516,
              monthlyDelta: -2,
              yearlyDelta: -24,
            },
          },
          coreInsights: {
            recommendation: "switch",
            reason: "core reason",
            priceImpactLevel: "moderate",
            monthlyDeltaAbs: 2,
            yearlyDeltaAbs: 24,
          },
          aiInsights: null,
          quota: {
            planId: "free",
            periodKey: "2026-03",
            resetsAt: "2026-04-01T00:00:00.000Z",
            used: 1,
            limit: 10,
            remaining: 9,
            isLimited: true,
          },
          fallbackReason: "provider_unavailable",
        }),
      },
    });
    const app = new Hono().route("/comparator", router);

    const quotaResponse = await app.request("/comparator/quota");
    expect(quotaResponse.status).toBe(403);

    const compareResponse = await app.request("/comparator/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPlan: {
          source: "manual",
          amount: 5,
          currency: "usd",
          every: 1,
          period: SubscriptionPeriod.MONTH,
        },
        candidatePlan: {
          source: "manual",
          amount: 6,
          currency: "usd",
          every: 1,
          period: SubscriptionPeriod.MONTH,
        },
      }),
    });

    expect(compareResponse.status).toBe(404);
  });

  it("returns success for quota and compare handlers", async () => {
    const router = createComparatorRouter({
      protectMiddleware: async (_context, next) => next(),
      getUserId: () => "user_1",
      service: {
        getQuota: async () => ({
          planId: "free",
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
          used: 1,
          limit: 10,
          remaining: 9,
          isLimited: true,
        }),
        getAiQuota: async () => ({
          planId: "free",
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
          used: 2,
          limit: 10,
          remaining: 8,
          isLimited: true,
        }),
        getRates: async () => ({
          baseCurrencyCode: "usd",
          rates: { usd: 1, eur: 0.92 },
        }),
        compare: async () => ({
          result: {
            preferredCurrencyCode: "usd",
            currentPlan: {
              source: "manual",
              subscriptionId: null,
              name: "Current",
              every: 1,
              period: SubscriptionPeriod.MONTH,
              currencyCode: "usd",
              immediateCharge: 10,
              monthlyAmount: 10,
              yearlyAmount: 120,
            },
            candidatePlan: {
              source: "manual",
              subscriptionId: null,
              name: "Candidate",
              every: 1,
              period: SubscriptionPeriod.MONTH,
              currencyCode: "usd",
              immediateCharge: 8,
              monthlyAmount: 8,
              yearlyAmount: 96,
            },
            delta: {
              monthlyDelta: -2,
              yearlyDelta: -24,
              monthlyPercent: -20,
              yearlyPercent: -20,
              direction: "save",
            },
            portfolioContext: {
              currentMonthlyTotal: 45,
              currentYearlyTotal: 540,
              projectedMonthlyTotal: 43,
              projectedYearlyTotal: 516,
              monthlyDelta: -2,
              yearlyDelta: -24,
            },
          },
          quota: {
            planId: "free",
            periodKey: "2026-03",
            resetsAt: "2026-04-01T00:00:00.000Z",
            used: 2,
            limit: 10,
            remaining: 8,
            isLimited: true,
          },
        }),
        analyze: async () => ({
          mode: "fallback",
          cacheHit: false,
          model: "gemini-2.5-flash-lite",
          compared: {
            preferredCurrencyCode: "usd",
            currentPlan: {
              source: "manual",
              subscriptionId: null,
              name: "Current",
              every: 1,
              period: SubscriptionPeriod.MONTH,
              currencyCode: "usd",
              immediateCharge: 10,
              monthlyAmount: 10,
              yearlyAmount: 120,
            },
            candidatePlan: {
              source: "manual",
              subscriptionId: null,
              name: "Candidate",
              every: 1,
              period: SubscriptionPeriod.MONTH,
              currencyCode: "usd",
              immediateCharge: 8,
              monthlyAmount: 8,
              yearlyAmount: 96,
            },
            delta: {
              monthlyDelta: -2,
              yearlyDelta: -24,
              monthlyPercent: -20,
              yearlyPercent: -20,
              direction: "save",
            },
            portfolioContext: {
              currentMonthlyTotal: 45,
              currentYearlyTotal: 540,
              projectedMonthlyTotal: 43,
              projectedYearlyTotal: 516,
              monthlyDelta: -2,
              yearlyDelta: -24,
            },
          },
          coreInsights: {
            recommendation: "switch",
            reason: "core reason",
            priceImpactLevel: "moderate",
            monthlyDeltaAbs: 2,
            yearlyDeltaAbs: 24,
          },
          aiInsights: null,
          quota: {
            planId: "free",
            periodKey: "2026-03",
            resetsAt: "2026-04-01T00:00:00.000Z",
            used: 2,
            limit: 10,
            remaining: 8,
            isLimited: true,
          },
          fallbackReason: "provider_unavailable",
        }),
      },
    });
    const app = new Hono().route("/comparator", router);

    const quotaResponse = await app.request("/comparator/quota");
    expect(quotaResponse.status).toBe(200);

    const ratesResponse = await app.request("/comparator/rates");
    expect(ratesResponse.status).toBe(200);

    const aiQuotaResponse = await app.request("/comparator/ai-quota");
    expect(aiQuotaResponse.status).toBe(200);

    const compareResponse = await app.request("/comparator/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPlan: {
          source: "manual",
          amount: 5,
          currency: "usd",
          every: 1,
          period: SubscriptionPeriod.MONTH,
        },
        candidatePlan: {
          source: "manual",
          amount: 6,
          currency: "usd",
          every: 1,
          period: SubscriptionPeriod.MONTH,
        },
      }),
    });

    expect(compareResponse.status).toBe(200);
    const data = await compareResponse.json();
    expect(data.result.delta.monthlyDelta).toBe(-2);

    const analyzeResponse = await app.request("/comparator/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        comparison: {
          currentPlan: {
            source: "manual",
            amount: 5,
            currency: "usd",
            every: 1,
            period: SubscriptionPeriod.MONTH,
          },
          candidatePlan: {
            source: "manual",
            amount: 6,
            currency: "usd",
            every: 1,
            period: SubscriptionPeriod.MONTH,
          },
        },
      }),
    });
    expect(analyzeResponse.status).toBe(200);
  });
});
