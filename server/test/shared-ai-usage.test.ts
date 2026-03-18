import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod, type SubscriptionDto } from "shared";
import { AiUsageService } from "../src/domains/ai/aiUsageService";
import { CategoryAiService } from "../src/domains/category/categoryAiService";
import { ComparatorService } from "../src/domains/comparator/comparatorService";

const createSubscription = (
  overrides: Partial<SubscriptionDto> = {},
): SubscriptionDto => ({
  id: "sub_1",
  userId: "user_1",
  name: "Spotify",
  cost: 10,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-01-01T00:00:00.000Z",
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  qstashMessageId: null,
  brandDomain: "spotify.com",
  billing: {
    original: {
      currencyCode: "usd",
      monthly: 10,
    },
    preferred: {
      currencyCode: "usd",
      amount: 10,
      monthly: 10,
      yearly: 120,
      exchangeRate: 1,
    },
  },
  nextPaymentDate: "2026-02-01T00:00:00.000Z",
  lastPaymentDate: null,
  willBeCancelledAt: null,
  scheduledPriceChange: null,
  status: "active",
  ...overrides,
});

const userPreferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  notificationTime: "10:00",
  notificationOffset: 1,
  locale: "en",
};

describe("shared AI usage quota", () => {
  it("counts comparator and category AI usage in the same monthly bucket", async () => {
    let analysesCount = 0;
    const periodKey = "2026-03";

    const comparatorRepository = {
      findAiUsageByUserAndPeriod: async () =>
        analysesCount === 0
          ? null
          : {
              id: 1,
              userId: "user_1",
              periodKey,
              analysesCount,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
      consumeAiMonthlyQuota: async (
        _db: unknown,
        { limit }: { limit: number },
      ) => {
        if (analysesCount >= limit) {
          return null;
        }

        analysesCount += 1;
        return {
          id: 1,
          userId: "user_1",
          periodKey,
          analysesCount,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      findAiCache: async () => null,
      upsertAiCache: async () => null,
    };

    const comparePayload = {
      currentPlan: {
        source: "existing" as const,
        subscriptionId: "sub_1",
      },
      candidatePlan: {
        source: "manual" as const,
        amount: 7,
        currency: "usd",
        every: 1,
        period: SubscriptionPeriod.MONTH,
      },
    };

    const compareResponse = await ComparatorService.analyze(
      "user_1",
      { comparison: comparePayload },
      {
        repository: comparatorRepository as never,
        userService: {
          getPlanId: async () => "free",
          getUserPreferences: async () => userPreferences,
        } as never,
        currencyService: {
          getRates: async () => ({ usd: 1 }),
        } as never,
        subscriptionService: {
          getSubscriptions: async () => [createSubscription()],
        } as never,
        aiUsageService: AiUsageService,
        aiClient: {
          generateInsights: async () => ({
            summary: "A cheaper option",
            recommendation: {
              decision: "switch",
              confidence: "medium",
              rationale: "Lower monthly cost.",
            },
            priceSignificance: {
              level: "moderate",
              explanation: "Clear monthly savings.",
            },
            annualCommitmentAdvice: {
              term: "monthly",
              confidence: "low",
              reason: "Try it before annual billing.",
            },
            serviceMaturity: {
              current: { level: "high", reason: "Stable history." },
              candidate: { level: "medium", reason: "Less long-term signal." },
            },
            risks: ["Potential feature mismatch."],
            citations: [{ title: "Source", url: "https://example.com" }],
            uncertainties: ["No trial details in source."],
          }),
        },
      },
    );

    expect(compareResponse.mode).toBe("ai");
    expect(compareResponse.quota.used).toBe(1);

    const categoryResponse = await CategoryAiService.suggestCategories(
      "user_1",
      {
        categoryRepository: {
          findByUserId: async () => [],
        } as never,
        subscriptionRepository: {
          findByUserId: async () => [
            {
              id: "sub_1",
              categoryId: null,
              name: "Spotify",
              brandDomain: "spotify.com",
            },
          ],
        } as never,
        comparatorRepository: comparatorRepository as never,
        categoryAiClient: {
          generateCategorySuggestions: async () => [
            {
              name: "Music",
              emoji: "🎵",
              subscriptionIds: ["sub_1"],
            },
          ],
        } as never,
        userService: {
          getPlanId: async () => "free",
          getUserPreferences: async () => userPreferences,
        } as never,
        aiUsageService: AiUsageService,
      },
    );

    expect(categoryResponse.suggestions).toHaveLength(1);
    expect(categoryResponse.quota.current).toBe(2);
  });
});
