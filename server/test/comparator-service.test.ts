import { describe, expect, it } from "bun:test";
import {
  SubscriptionPeriod,
  type CompareSubscriptionsInput,
  type SubscriptionDto,
} from "shared";
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

const comparePayload: CompareSubscriptionsInput = {
  currentPlan: {
    source: "existing",
    subscriptionId: "sub_1",
  },
  candidatePlan: {
    source: "manual",
    amount: 5,
    currency: "usd",
    every: 1,
    period: SubscriptionPeriod.MONTH,
  },
};

describe("ComparatorService.compare", () => {
  it("returns comparison result and consumes free quota", async () => {
    const response = await ComparatorService.compare("user_1", comparePayload, {
      repository: {
        consumeMonthlyQuota: async () => ({
          id: 1,
          userId: "user_1",
          periodKey: "2026-03",
          comparisonsCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findByUserAndPeriod: async () => null,
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
      currencyService: {
        getRates: async () => ({ usd: 1 }),
      } as never,
      subscriptionService: {
        getSubscriptions: async () => [createSubscription()],
      } as never,
    });

    expect(response.result.delta.monthlyDelta).toBe(-5);
    expect(response.result.delta.direction).toBe("save");
    expect(response.quota.limit).toBe(10);
    expect(response.quota.remaining).toBe(9);
  });

  it("throws when free quota is exceeded", async () => {
    await expect(
      ComparatorService.compare("user_1", comparePayload, {
        repository: {
          consumeMonthlyQuota: async () => null,
          findByUserAndPeriod: async () => null,
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
        currencyService: {
          getRates: async () => ({ usd: 1 }),
        } as never,
        subscriptionService: {
          getSubscriptions: async () => [createSubscription()],
        } as never,
      }),
    ).rejects.toThrow("Comparator quota exceeded");
  });
});

describe("ComparatorService.getQuota", () => {
  it("returns free plan quota with remaining amount", async () => {
    const quota = await ComparatorService.getQuota("user_1", {
      repository: {
        findByUserAndPeriod: async () => ({
          id: 1,
          userId: "user_1",
          periodKey: "2026-03",
          comparisonsCount: 2,
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
      currencyService: {} as never,
      subscriptionService: {} as never,
    });

    expect(quota.limit).toBe(10);
    expect(quota.used).toBe(2);
    expect(quota.remaining).toBe(8);
  });

  it("returns unlimited quota for plus plan", async () => {
    const quota = await ComparatorService.getQuota("user_1", {
      repository: {
        findByUserAndPeriod: async () => ({
          id: 1,
          userId: "user_1",
          periodKey: "2026-03",
          comparisonsCount: 4,
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
      currencyService: {} as never,
      subscriptionService: {} as never,
    });

    expect(quota.isLimited).toBe(false);
    expect(quota.limit).toBeNull();
    expect(quota.remaining).toBeNull();
    expect(quota.used).toBe(4);
  });
});

describe("ComparatorService.analyze", () => {
  it("returns fallback mode when AI quota is exhausted", async () => {
    const response = await ComparatorService.analyze(
      "user_1",
      { comparison: comparePayload },
      {
        repository: {
          findAiUsageByUserAndPeriod: async () => ({
            id: 1,
            userId: "user_1",
            periodKey: "2026-03",
            analysesCount: 10,
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
        currencyService: {
          getRates: async () => ({ usd: 1 }),
        } as never,
        subscriptionService: {
          getSubscriptions: async () => [createSubscription()],
        } as never,
        aiClient: {
          generateInsights: async () => {
            throw new Error("should not generate");
          },
        },
      },
    );

    expect(response.mode).toBe("fallback");
    expect(response.fallbackReason).toBe("quota_exceeded");
    expect(response.aiInsights).toBeNull();
    expect(response.quota.limit).toBe(10);
    expect(response.quota.remaining).toBe(0);
  });

  it("returns cached AI analysis without consuming quota", async () => {
    const response = await ComparatorService.analyze(
      "user_1",
      { comparison: comparePayload },
      {
        repository: {
          findAiUsageByUserAndPeriod: async () => ({
            id: 1,
            userId: "user_1",
            periodKey: "2026-03",
            analysesCount: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          findAiCache: async () => ({
            id: 1,
            userId: "user_1",
            periodKey: "2026-03",
            requestHash: "hash",
            model: "gemini-2.5-flash-lite",
            promptVersion: "v1",
            response: {
              summary: "cached summary",
              recommendation: {
                decision: "switch",
                confidence: "medium",
                rationale: "candidate is cheaper",
              },
              priceSignificance: {
                level: "moderate",
                explanation: "meaningful monthly delta",
              },
              annualCommitmentAdvice: {
                term: "monthly",
                confidence: "low",
                reason: "test reason",
              },
              serviceMaturity: {
                current: { level: "high", reason: "stable" },
                candidate: { level: "high", reason: "stable" },
              },
              risks: ["risk"],
              citations: [{ title: "Source", url: "https://example.com" }],
              uncertainties: ["uncertain"],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          consumeAiMonthlyQuota: async () => {
            throw new Error("quota should not be consumed on cache hit");
          },
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
        currencyService: {
          getRates: async () => ({ usd: 1 }),
        } as never,
        subscriptionService: {
          getSubscriptions: async () => [createSubscription()],
        } as never,
        aiClient: {
          generateInsights: async () => {
            throw new Error("should not generate when cache exists");
          },
        },
      },
    );

    expect(response.mode).toBe("ai");
    expect(response.cacheHit).toBe(true);
    expect(response.aiInsights?.summary).toBe("cached summary");
    expect(response.quota.used).toBe(2);
  });

  it("marks same-service billing cadence comparisons in AI prompt context", async () => {
    let capturedPrompt = "";

    const response = await ComparatorService.analyze(
      "user_1",
      {
        comparison: {
          currentPlan: {
            source: "manual",
            name: "Fastmail monthly",
            amount: 6,
            currency: "usd",
            every: 1,
            period: SubscriptionPeriod.MONTH,
          },
          candidatePlan: {
            source: "manual",
            name: "Fastmail 2 years",
            amount: 120,
            currency: "usd",
            every: 2,
            period: SubscriptionPeriod.YEAR,
          },
        },
      },
      {
        repository: {
          findAiUsageByUserAndPeriod: async () => null,
          findAiCache: async () => null,
          consumeAiMonthlyQuota: async () => ({
            id: 1,
            userId: "user_1",
            periodKey: "2026-03",
            analysesCount: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          upsertAiCache: async () => undefined,
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
        currencyService: {
          getRates: async () => ({ usd: 1 }),
        } as never,
        subscriptionService: {
          getSubscriptions: async () => [],
        } as never,
        aiClient: {
          generateInsights: async (prompt: string) => {
            capturedPrompt = prompt;

            return {
              summary:
                "Fastmail has solid market reputation, so cadence fit drives this choice.",
              recommendation: {
                decision: "depends",
                confidence: "medium",
                rationale:
                  "Monthly flexibility may outweigh long prepay lock-in despite lower normalized cost.",
              },
              priceSignificance: {
                level: "moderate",
                explanation: "The normalized monthly delta is meaningful.",
              },
              annualCommitmentAdvice: {
                term: "either",
                confidence: "medium",
                reason:
                  "Choose yearly only if you are confident you will keep using the service.",
              },
              serviceMaturity: {
                current: {
                  level: "high",
                  reason:
                    "Same provider, so service maturity is effectively the same.",
                },
                candidate: {
                  level: "high",
                  reason:
                    "Same provider, so service maturity is effectively the same.",
                },
              },
              risks: ["Long prepay terms reduce flexibility."],
              citations: [{ title: "Source", url: "https://example.com" }],
              uncertainties: ["Future pricing policy may change."],
            };
          },
        },
      },
    );

    expect(response.mode).toBe("ai");
    expect(capturedPrompt).toContain('"sameService": true');
    expect(capturedPrompt).toContain(
      '"sameServiceSignal": "normalized_name_match"',
    );
    expect(capturedPrompt).toContain(
      "do not frame this as head-to-head provider competition",
    );
  });

  it("uses preferred currency in AI prose when provider returns foreign currency mentions", async () => {
    let aiCalls = 0;

    const response = await ComparatorService.analyze(
      "user_1",
      { comparison: comparePayload },
      {
        repository: {
          findAiUsageByUserAndPeriod: async () => null,
          findAiCache: async () => null,
          consumeAiMonthlyQuota: async () => ({
            id: 1,
            userId: "user_1",
            periodKey: "2026-03",
            analysesCount: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          upsertAiCache: async () => undefined,
        } as never,
        userService: {
          getPlanId: async () => "free",
          getUserPreferences: async () => ({
            preferredCurrency: "uah",
            preferredTimezone: "UTC",
            notificationTime: "10:00",
            notificationOffset: 1,
            locale: "uk",
          }),
        } as never,
        currencyService: {
          getRates: async () => ({ uah: 1 }),
        } as never,
        subscriptionService: {
          getSubscriptions: async () => [createSubscription()],
        } as never,
        aiClient: {
          generateInsights: async () => {
            aiCalls += 1;

            if (aiCalls === 1) {
              return {
                summary: "Економія становить 107.34 USD на місяць.",
                recommendation: {
                  decision: "switch",
                  confidence: "high",
                  rationale: "План дешевший.",
                },
                priceSignificance: {
                  level: "material",
                  explanation: "Різниця суттєва.",
                },
                annualCommitmentAdvice: {
                  term: "monthly",
                  confidence: "medium",
                  reason: "Варто почати з місячної оплати.",
                },
                serviceMaturity: {
                  current: { level: "high", reason: "Сервіс стабільний." },
                  candidate: { level: "high", reason: "Сервіс стабільний." },
                },
                risks: ["Можливі зміни умов."],
                citations: [{ title: "Source", url: "https://example.com" }],
                uncertainties: ["Умови можуть змінюватися."],
              };
            }

            return {
              summary: "Економія становить 107.34 UAH на місяць.",
              recommendation: {
                decision: "switch",
                confidence: "high",
                rationale: "План дешевший.",
              },
              priceSignificance: {
                level: "material",
                explanation: "Різниця суттєва.",
              },
              annualCommitmentAdvice: {
                term: "monthly",
                confidence: "medium",
                reason: "Варто почати з місячної оплати.",
              },
              serviceMaturity: {
                current: { level: "high", reason: "Сервіс стабільний." },
                candidate: { level: "high", reason: "Сервіс стабільний." },
              },
              risks: ["Можливі зміни умов."],
              citations: [{ title: "Source", url: "https://example.com" }],
              uncertainties: ["Умови можуть змінюватися."],
            };
          },
        },
      },
    );

    expect(response.mode).toBe("ai");
    expect(aiCalls).toBe(2);
    expect(response.aiInsights?.summary.includes("USD")).toBe(false);
    expect(response.aiInsights?.summary.includes("UAH")).toBe(true);
  });
});
