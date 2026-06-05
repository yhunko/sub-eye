import { describe, expect, it } from "bun:test";
import { CategoryAiService } from "../src/domains/category/categoryAiService";
import {
  CategoryAiQuotaExceededError,
  CategoryLimitReachedError,
} from "../src/domains/category/categoryErrors";

type AiUsageContext = {
  planId: "free" | "plus";
  quotaWindow: {
    periodKey: string;
    resetsAt: string;
  };
  used: number;
  limit: number;
};

const createAiUsageServiceMock = ({
  context,
  consumedContext,
}: {
  context: AiUsageContext;
  consumedContext?: AiUsageContext | null;
}) =>
  ({
    getContext: async () => context,
    toQuotaDto: (value: AiUsageContext) => ({
      planId: value.planId,
      periodKey: value.quotaWindow.periodKey,
      resetsAt: value.quotaWindow.resetsAt,
      used: value.used,
      limit: value.limit,
      remaining: Math.max(value.limit - value.used, 0),
      isLimited: true,
    }),
    consume: async () => consumedContext ?? context,
  }) as never;

const userPreferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  notificationTime: "10:00",
  notificationOffset: 1,
  locale: "en",
};

describe("CategoryAiService.suggestCategories", () => {
  it("throws when shared AI quota is exhausted", async () => {
    const aiUsageService = createAiUsageServiceMock({
      context: {
        planId: "free",
        quotaWindow: {
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
        },
        used: 10,
        limit: 10,
      },
    });

    await expect(
      CategoryAiService.suggestCategories("user_1", {
        categoryRepository: {
          findByUserId: async () => [],
        } as never,
        subscriptionRepository: {
          findByUserId: async () => [
            {
              id: "sub_1",
              categoryId: null,
              name: "Netflix",
              brandDomain: "netflix.com",
            },
          ],
        } as never,
        comparatorRepository: {} as never,
        categoryAiClient: {
          generateCategorySuggestions: async () => {
            throw new Error("should not generate");
          },
        } as never,
        userService: {
          getUserPreferences: async () => userPreferences,
        } as never,
        aiUsageService,
      }),
    ).rejects.toBeInstanceOf(CategoryAiQuotaExceededError);
  });

  it("returns deduped suggestions from uncategorized subscriptions only", async () => {
    let receivedLocale: string | null = null;
    const aiUsageService = createAiUsageServiceMock({
      context: {
        planId: "free",
        quotaWindow: {
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
        },
        used: 0,
        limit: 10,
      },
      consumedContext: {
        planId: "free",
        quotaWindow: {
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
        },
        used: 1,
        limit: 10,
      },
    });

    const response = await CategoryAiService.suggestCategories("user_1", {
      categoryRepository: {
        findByUserId: async () => [
          {
            id: "cat_existing",
            userId: "user_1",
            name: "Entertainment",
            emoji: "🎬",
          },
        ],
      } as never,
      subscriptionRepository: {
        findByUserId: async () => [
          {
            id: "sub_1",
            categoryId: null,
            name: "Netflix",
            brandDomain: "netflix.com",
          },
          {
            id: "sub_2",
            categoryId: "cat_existing",
            name: "Spotify",
            brandDomain: "spotify.com",
          },
        ],
      } as never,
      comparatorRepository: {} as never,
      categoryAiClient: {
        generateCategorySuggestions: async (input) => {
          receivedLocale = input.locale;
          return [
            {
              name: "Entertainment",
              emoji: "🎬",
              subscriptionIds: ["sub_1"],
            },
            {
              name: "Productivity",
              emoji: "💻",
              subscriptionIds: ["sub_1", "sub_2"],
            },
            {
              name: "productivity",
              emoji: "💻",
              subscriptionIds: ["sub_1"],
            },
          ];
        },
      } as never,
      userService: {
        getUserPreferences: async () => ({ ...userPreferences, locale: "uk" }),
      } as never,
      aiUsageService,
    });

    expect(response.sourceCount).toBe(1);
    expect(response.suggestions).toHaveLength(1);
    expect(response.suggestions[0]).toMatchObject({
      name: "Productivity",
      emoji: "💻",
      subscriptionIds: ["sub_1"],
      enabled: true,
    });
    expect(response.quota.current).toBe(1);
    expect(receivedLocale).toBe("uk");
  });
});

describe("CategoryAiService.applyCategories", () => {
  it("creates missing categories, maps duplicates to existing, and assigns uncategorized subscriptions only", async () => {
    const updates: Array<{ id: string; categoryId: string | null }> = [];
    const creates: Array<{ name: string; emoji: string }> = [];
    let createCounter = 0;

    const response = await CategoryAiService.applyCategories(
      "user_1",
      {
        suggestions: [
          {
            draftId: "d1",
            name: " Entertainment ",
            emoji: "🎬",
            subscriptionIds: ["sub_1", "sub_2"],
            enabled: true,
          },
          {
            draftId: "d2",
            name: "Productivity",
            emoji: "💻",
            subscriptionIds: ["sub_2", "sub_3"],
            enabled: true,
          },
          {
            draftId: "d3",
            name: "Disabled",
            emoji: "📦",
            subscriptionIds: ["sub_1"],
            enabled: false,
          },
        ],
      },
      {
        categoryRepository: {
          findByUserId: async () => [
            {
              id: "cat_existing",
              userId: "user_1",
              name: "Entertainment",
              emoji: "🎬",
            },
          ],
          create: async (payload) => {
            creates.push({ name: payload.name, emoji: payload.emoji });
            createCounter += 1;
            return {
              id: `cat_new_${createCounter}`,
              userId: payload.userId,
              name: payload.name,
              emoji: payload.emoji,
            };
          },
        } as never,
        subscriptionRepository: {
          findByUserId: async () => [
            { id: "sub_1", categoryId: null },
            { id: "sub_2", categoryId: "cat_other" },
            { id: "sub_3", categoryId: null },
          ],
          update: async (id, payload) => {
            updates.push({ id, categoryId: payload.categoryId ?? null });
            return { id, ...payload };
          },
        } as never,
        comparatorRepository: {} as never,
        categoryAiClient: {} as never,
        userService: {
          getPlanId: async () => "free",
        } as never,
        aiUsageService: createAiUsageServiceMock({
          context: {
            planId: "free",
            quotaWindow: {
              periodKey: "2026-03",
              resetsAt: "2026-04-01T00:00:00.000Z",
            },
            used: 5,
            limit: 10,
          },
        }),
      },
    );

    expect(response.createdCount).toBe(1);
    expect(response.skippedExistingCount).toBe(1);
    expect(response.assignedCount).toBe(2);
    expect(response.quota.current).toBe(5);
    expect(creates).toEqual([{ name: "Productivity", emoji: "💻" }]);
    expect(updates).toEqual([
      { id: "sub_1", categoryId: "cat_existing" },
      { id: "sub_3", categoryId: "cat_new_1" },
    ]);
  });

  it("throws when category limit is reached while creating new categories", async () => {
    const existingCategories = Array.from({ length: 20 }, (_, index) => ({
      id: `cat_${index}`,
      userId: "user_1",
      name: `Category ${index}`,
      emoji: "📦",
    }));

    await expect(
      CategoryAiService.applyCategories(
        "user_1",
        {
          suggestions: [
            {
              draftId: "d1",
              name: "New Category",
              emoji: "💻",
              subscriptionIds: ["sub_1"],
              enabled: true,
            },
          ],
        },
        {
          categoryRepository: {
            findByUserId: async () => existingCategories,
          } as never,
          subscriptionRepository: {
            findByUserId: async () => [{ id: "sub_1", categoryId: null }],
          } as never,
          comparatorRepository: {} as never,
          categoryAiClient: {} as never,
          userService: {
            getPlanId: async () => "free",
          } as never,
          aiUsageService: createAiUsageServiceMock({
            context: {
              planId: "free",
              quotaWindow: {
                periodKey: "2026-03",
                resetsAt: "2026-04-01T00:00:00.000Z",
              },
              used: 1,
              limit: 10,
            },
          }),
        },
      ),
    ).rejects.toBeInstanceOf(CategoryLimitReachedError);
  });
});

describe("CategoryAiService.suggestOptimization", () => {
  it("throws when shared AI quota is exhausted", async () => {
    const aiUsageService = createAiUsageServiceMock({
      context: {
        planId: "free",
        quotaWindow: {
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
        },
        used: 10,
        limit: 10,
      },
    });

    await expect(
      CategoryAiService.suggestOptimization("user_1", {
        categoryRepository: {
          findByUserId: async () => [
            {
              id: "cat_1",
              userId: "user_1",
              name: "Entertainment",
              emoji: "🎬",
            },
          ],
        } as never,
        subscriptionRepository: {
          findByUserId: async () => [
            {
              id: "sub_1",
              categoryId: "cat_1",
              name: "Netflix",
              brandDomain: "netflix.com",
            },
          ],
        } as never,
        comparatorRepository: {} as never,
        categoryAiClient: {
          generateCategoryOptimization: async () => {
            throw new Error("should not optimize");
          },
        } as never,
        userService: {
          getUserPreferences: async () => userPreferences,
        } as never,
        aiUsageService,
      }),
    ).rejects.toBeInstanceOf(CategoryAiQuotaExceededError);
  });

  it("returns deduped valid reassignments and merges only", async () => {
    const aiUsageService = createAiUsageServiceMock({
      context: {
        planId: "free",
        quotaWindow: {
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
        },
        used: 0,
        limit: 10,
      },
      consumedContext: {
        planId: "free",
        quotaWindow: {
          periodKey: "2026-03",
          resetsAt: "2026-04-01T00:00:00.000Z",
        },
        used: 1,
        limit: 10,
      },
    });

    const response = await CategoryAiService.suggestOptimization("user_1", {
      categoryRepository: {
        findByUserId: async () => [
          {
            id: "cat_ent",
            userId: "user_1",
            name: "Entertainment",
            emoji: "🎬",
          },
          {
            id: "cat_music",
            userId: "user_1",
            name: "Music",
            emoji: "🎵",
          },
          {
            id: "cat_streaming",
            userId: "user_1",
            name: "Streaming",
            emoji: "📺",
          },
          {
            id: "cat_mobile",
            userId: "user_1",
            name: "Мобільний зв'язок",
            emoji: "📱",
          },
          {
            id: "cat_mail",
            userId: "user_1",
            name: "Пошта",
            emoji: "✉️",
          },
        ],
      } as never,
      subscriptionRepository: {
        findByUserId: async () => [
          {
            id: "sub_1",
            categoryId: "cat_ent",
            name: "Netflix",
            brandDomain: "netflix.com",
          },
          {
            id: "sub_2",
            categoryId: "cat_streaming",
            name: "Spotify",
            brandDomain: "spotify.com",
          },
          {
            id: "sub_3",
            categoryId: "cat_mail",
            name: "Fastmail",
            brandDomain: "fastmail.com",
          },
        ],
      } as never,
      comparatorRepository: {} as never,
      categoryAiClient: {
        generateCategoryOptimization: async () => ({
          reassignments: [
            {
              subscriptionId: "sub_1",
              toCategoryId: "cat_streaming",
              reason: "Better media category",
              targetFit: 0.88,
              sourceFit: 0.33,
            },
            {
              subscriptionId: "sub_1",
              toCategoryId: "cat_music",
              reason: "Duplicate, should be ignored",
              targetFit: 0.72,
              sourceFit: 0.31,
            },
            {
              subscriptionId: "sub_2",
              toCategoryId: "cat_streaming",
              reason: "No-op, should be dropped",
              targetFit: 0.9,
              sourceFit: 0.9,
            },
            {
              subscriptionId: "sub_3",
              toCategoryId: "cat_mobile",
              reason: "Wrong semantic match, should be dropped",
              targetFit: 0.22,
              sourceFit: 0.91,
            },
            {
              subscriptionId: "sub_404",
              toCategoryId: "cat_music",
              reason: "Invalid subscription",
              targetFit: 0.8,
              sourceFit: 0.2,
            },
          ],
          merges: [
            {
              sourceCategoryId: "cat_streaming",
              targetCategoryId: "cat_ent",
              reason: "Same spending domain",
            },
            {
              sourceCategoryId: "cat_streaming",
              targetCategoryId: "cat_music",
              reason: "Duplicate source, should be ignored",
            },
            {
              sourceCategoryId: "cat_music",
              targetCategoryId: "cat_streaming",
              reason: "Merge chain, should be ignored",
            },
            {
              sourceCategoryId: "cat_ent",
              targetCategoryId: "cat_ent",
              reason: "Self merge, should be ignored",
            },
          ],
        }),
      } as never,
      userService: {
        getUserPreferences: async () => userPreferences,
      } as never,
      aiUsageService,
    });

    expect(response.reassignments).toEqual([
      {
        subscriptionId: "sub_1",
        fromCategoryId: "cat_ent",
        toCategoryId: "cat_streaming",
        reason: "Better media category",
        enabled: true,
      },
    ]);
    expect(response.merges).toEqual([
      {
        sourceCategoryId: "cat_streaming",
        targetCategoryId: "cat_ent",
        affectedCount: 1,
        reason: "Same spending domain",
        enabled: true,
      },
    ]);
    expect(response.quota.current).toBe(1);
  });
});

describe("CategoryAiService.applyOptimization", () => {
  it("applies explicit reassignments before merge fallback and removes only empty merged sources", async () => {
    const updates: Array<{ id: string; categoryId: string | null }> = [];
    const deletedCategoryIds: string[] = [];

    const response = await CategoryAiService.applyOptimization(
      "user_1",
      {
        reassignments: [
          {
            subscriptionId: "sub_1",
            fromCategoryId: "cat_source",
            toCategoryId: "cat_target",
            reason: "Explicit move",
            enabled: true,
          },
        ],
        merges: [
          {
            sourceCategoryId: "cat_source",
            targetCategoryId: "cat_target",
            affectedCount: 2,
            reason: "Merge duplicate",
            enabled: true,
          },
        ],
      },
      {
        categoryRepository: {
          findByUserId: async () => [
            {
              id: "cat_source",
              userId: "user_1",
              name: "Streaming",
              emoji: "📺",
            },
            {
              id: "cat_target",
              userId: "user_1",
              name: "Entertainment",
              emoji: "🎬",
            },
          ],
          delete: async (id) => {
            deletedCategoryIds.push(id);
          },
        } as never,
        subscriptionRepository: {
          findByUserId: async () => [
            { id: "sub_1", categoryId: "cat_source" },
            { id: "sub_2", categoryId: "cat_source" },
            { id: "sub_3", categoryId: "cat_target" },
          ],
          update: async (id, payload) => {
            updates.push({ id, categoryId: payload.categoryId ?? null });
            return { id, ...payload };
          },
        } as never,
        comparatorRepository: {} as never,
        categoryAiClient: {} as never,
        userService: {} as never,
        aiUsageService: createAiUsageServiceMock({
          context: {
            planId: "free",
            quotaWindow: {
              periodKey: "2026-03",
              resetsAt: "2026-04-01T00:00:00.000Z",
            },
            used: 3,
            limit: 10,
          },
        }),
      },
    );

    expect(updates).toEqual([
      { id: "sub_1", categoryId: "cat_target" },
      { id: "sub_2", categoryId: "cat_target" },
    ]);
    expect(deletedCategoryIds).toEqual(["cat_source"]);
    expect(response.reassignedCount).toBe(2);
    expect(response.mergedCount).toBe(1);
    expect(response.deletedEmptyCategoriesCount).toBe(1);
  });

  it("keeps merged source category when it still has subscriptions after explicit override", async () => {
    const deletedCategoryIds: string[] = [];

    const response = await CategoryAiService.applyOptimization(
      "user_1",
      {
        reassignments: [
          {
            subscriptionId: "sub_1",
            fromCategoryId: "cat_source",
            toCategoryId: "cat_other",
            reason: "Move elsewhere",
            enabled: true,
          },
          {
            subscriptionId: "sub_3",
            fromCategoryId: "cat_other",
            toCategoryId: "cat_source",
            reason: "Explicitly keep in source category",
            enabled: true,
          },
        ],
        merges: [
          {
            sourceCategoryId: "cat_source",
            targetCategoryId: "cat_target",
            affectedCount: 1,
            reason: "Merge duplicate",
            enabled: true,
          },
        ],
      },
      {
        categoryRepository: {
          findByUserId: async () => [
            { id: "cat_source", userId: "user_1", name: "A", emoji: "📦" },
            { id: "cat_target", userId: "user_1", name: "B", emoji: "🎬" },
            { id: "cat_other", userId: "user_1", name: "C", emoji: "🎵" },
          ],
          delete: async (id) => {
            deletedCategoryIds.push(id);
          },
        } as never,
        subscriptionRepository: {
          findByUserId: async () => [
            { id: "sub_1", categoryId: "cat_source" },
            { id: "sub_2", categoryId: "cat_source" },
            { id: "sub_3", categoryId: "cat_other" },
          ],
          update: async (id, payload) => ({ id, ...payload }),
        } as never,
        comparatorRepository: {} as never,
        categoryAiClient: {} as never,
        userService: {} as never,
        aiUsageService: createAiUsageServiceMock({
          context: {
            planId: "free",
            quotaWindow: {
              periodKey: "2026-03",
              resetsAt: "2026-04-01T00:00:00.000Z",
            },
            used: 1,
            limit: 10,
          },
        }),
      },
    );

    expect(deletedCategoryIds).toEqual([]);
    expect(response.deletedEmptyCategoriesCount).toBe(0);
    expect(response.mergedCount).toBe(1);
  });
});
