import {
  type AiUsageQuota,
  CATEGORY_EMOJIS,
  type CategoryAiApplyInput,
  type CategoryAiApplyResponse,
  type CategoryAiOptimizationMerge,
  type CategoryAiOptimizationReassignment,
  type CategoryAiOptimizeApplyInput,
  type CategoryAiOptimizeApplyResponse,
  type CategoryAiOptimizeSuggestResponse,
  type CategoryAiSuggestResponse,
  COMPARATOR_AI_MODEL,
  DEFAULT_CATEGORY_EMOJI,
  getPlanById,
} from "@subeye/shared";
import type { db } from "../../db";
import { AiUsageService } from "../ai/aiUsageService";
import { ComparatorRepository } from "../comparator/comparatorRepository";
import { SubscriptionRepository } from "../subscription/subscriptionRepository";
import { UserService } from "../user/userService";
import { CategoryAiClient } from "./categoryAiClient";
import {
  CategoryAiQuotaExceededError,
  CategoryLimitReachedError,
} from "./categoryErrors";
import { CategoryRepository } from "./categoryRepository";

type CategoryAiServiceDeps = {
  categoryRepository: typeof CategoryRepository;
  subscriptionRepository: typeof SubscriptionRepository;
  comparatorRepository: typeof ComparatorRepository;
  categoryAiClient: typeof CategoryAiClient;
  userService: typeof UserService;
  aiUsageService: typeof AiUsageService;
  runInTransaction?: <T>(run: (tx: unknown) => Promise<T>) => Promise<T>;
};

const defaultDeps: CategoryAiServiceDeps = {
  categoryRepository: CategoryRepository,
  subscriptionRepository: SubscriptionRepository,
  comparatorRepository: ComparatorRepository,
  categoryAiClient: CategoryAiClient,
  userService: UserService,
  aiUsageService: AiUsageService,
  runInTransaction: (run) => CategoryRepository.runInTransaction(run),
};

const ALLOWED_EMOJIS = new Set(CATEGORY_EMOJIS);

const toAiUsageDeps = (deps: CategoryAiServiceDeps) => ({
  comparatorRepository: deps.comparatorRepository,
  userService: deps.userService,
});

const normalizeCategoryName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const normalizeReason = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Better category fit";
  }

  return trimmed.slice(0, 96);
};

const MIN_OPTIMIZATION_TARGET_FIT = 0.58;
const MIN_OPTIMIZATION_FIT_IMPROVEMENT = 0.12;

const toFitValue = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0 || value > 1) {
    return null;
  }

  return value;
};

const shouldAcceptReassignmentByFit = ({
  targetFit,
  sourceFit,
  hasSourceCategory,
}: {
  targetFit: unknown;
  sourceFit: unknown;
  hasSourceCategory: boolean;
}): boolean => {
  const normalizedTargetFit = toFitValue(targetFit);
  if (
    normalizedTargetFit === null ||
    normalizedTargetFit < MIN_OPTIMIZATION_TARGET_FIT
  ) {
    return false;
  }

  if (!hasSourceCategory) {
    return true;
  }

  const normalizedSourceFit = toFitValue(sourceFit);
  if (normalizedSourceFit === null) {
    return normalizedTargetFit >= MIN_OPTIMIZATION_TARGET_FIT + 0.12;
  }

  return (
    normalizedTargetFit - normalizedSourceFit >=
    MIN_OPTIMIZATION_FIT_IMPROVEMENT
  );
};

const toQuota = (quota: {
  used: number;
  limit: number | null;
  remaining: number | null;
  periodKey: string;
  resetsAt: string;
  isLimited: boolean;
}): AiUsageQuota => ({
  current: quota.used,
  limit: quota.limit,
  remaining: quota.remaining,
  periodKey: quota.periodKey,
  resetsAt: quota.resetsAt,
  isLimited: quota.isLimited,
});

export class CategoryAiService {
  static async suggestCategories(
    userId: string,
    deps: CategoryAiServiceDeps = defaultDeps,
  ): Promise<CategoryAiSuggestResponse> {
    const aiUsageDeps = toAiUsageDeps(deps);
    const [aiContext, subscriptions, categories, preferences] =
      await Promise.all([
        deps.aiUsageService.getContext(userId, aiUsageDeps),
        deps.subscriptionRepository.findByUserId(userId),
        deps.categoryRepository.findByUserId(userId),
        deps.userService.getUserPreferences(userId),
      ]);

    if (aiContext.used >= aiContext.limit) {
      throw new CategoryAiQuotaExceededError();
    }

    const uncategorizedSubscriptions = subscriptions.filter(
      (subscription) => subscription.categoryId === null,
    );
    const quota = toQuota(deps.aiUsageService.toQuotaDto(aiContext));

    if (uncategorizedSubscriptions.length === 0) {
      return {
        model: COMPARATOR_AI_MODEL,
        sourceCount: 0,
        generatedAt: new Date().toISOString(),
        quota,
        suggestions: [],
      };
    }

    const generated = await deps.categoryAiClient.generateCategorySuggestions({
      locale: preferences.locale,
      subscriptions: uncategorizedSubscriptions.map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        brandDomain: subscription.brandDomain,
      })),
    });

    const sourceIds = new Set(uncategorizedSubscriptions.map((s) => s.id));
    const assignedSourceIds = new Set<string>();
    const existingCategoryNames = new Set(
      categories.map((category) => normalizeCategoryName(category.name)),
    );

    const deduped = new Map<
      string,
      {
        draftId: string;
        name: string;
        emoji: string;
        subscriptionIds: string[];
        enabled: true;
      }
    >();

    for (const suggestion of generated) {
      const name = suggestion.name.trim();
      const normalizedName = normalizeCategoryName(name);
      if (!normalizedName || existingCategoryNames.has(normalizedName)) {
        continue;
      }

      const uniqueIds = Array.from(new Set(suggestion.subscriptionIds)).filter(
        (id) => sourceIds.has(id) && !assignedSourceIds.has(id),
      );

      if (uniqueIds.length === 0) {
        continue;
      }

      for (const id of uniqueIds) {
        assignedSourceIds.add(id);
      }

      const target = deduped.get(normalizedName);
      if (target) {
        target.subscriptionIds = Array.from(
          new Set([...target.subscriptionIds, ...uniqueIds]),
        );
        continue;
      }

      deduped.set(normalizedName, {
        draftId: `draft_${deduped.size + 1}`,
        name,
        emoji: ALLOWED_EMOJIS.has(suggestion.emoji)
          ? suggestion.emoji
          : DEFAULT_CATEGORY_EMOJI,
        subscriptionIds: uniqueIds,
        enabled: true,
      });
    }

    const consumedContext = await deps.aiUsageService.consume(
      userId,
      aiContext,
      aiUsageDeps,
    );
    if (!consumedContext) {
      throw new CategoryAiQuotaExceededError();
    }

    return {
      model: COMPARATOR_AI_MODEL,
      sourceCount: uncategorizedSubscriptions.length,
      generatedAt: new Date().toISOString(),
      quota: toQuota(deps.aiUsageService.toQuotaDto(consumedContext)),
      suggestions: Array.from(deduped.values()),
    };
  }

  static async suggestOptimization(
    userId: string,
    deps: CategoryAiServiceDeps = defaultDeps,
  ): Promise<CategoryAiOptimizeSuggestResponse> {
    const aiUsageDeps = toAiUsageDeps(deps);

    const [aiContext, subscriptions, categories, preferences] =
      await Promise.all([
        deps.aiUsageService.getContext(userId, aiUsageDeps),
        deps.subscriptionRepository.findByUserId(userId),
        deps.categoryRepository.findByUserId(userId),
        deps.userService.getUserPreferences(userId),
      ]);

    if (aiContext.used >= aiContext.limit) {
      throw new CategoryAiQuotaExceededError();
    }

    const sourceCount = subscriptions.length;
    const quota = toQuota(deps.aiUsageService.toQuotaDto(aiContext));

    if (sourceCount === 0 || categories.length === 0) {
      return {
        model: COMPARATOR_AI_MODEL,
        sourceCount,
        generatedAt: new Date().toISOString(),
        quota,
        reassignments: [],
        merges: [],
      };
    }

    const generated = await deps.categoryAiClient.generateCategoryOptimization({
      locale: preferences.locale,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        emoji: category.emoji,
      })),
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        brandDomain: subscription.brandDomain,
        categoryId: subscription.categoryId,
      })),
    });

    const categoryIdSet = new Set(categories.map((category) => category.id));
    const subscriptionById = new Map(
      subscriptions.map((subscription) => [subscription.id, subscription]),
    );

    const reassignmentsBySubscriptionId = new Map<
      string,
      CategoryAiOptimizationReassignment
    >();

    for (const reassignment of generated.reassignments) {
      const subscription = subscriptionById.get(reassignment.subscriptionId);
      if (!subscription) {
        continue;
      }

      if (!categoryIdSet.has(reassignment.toCategoryId)) {
        continue;
      }

      if (subscription.categoryId === reassignment.toCategoryId) {
        continue;
      }

      if (
        !shouldAcceptReassignmentByFit({
          targetFit: reassignment.targetFit,
          sourceFit: reassignment.sourceFit,
          hasSourceCategory: subscription.categoryId !== null,
        })
      ) {
        continue;
      }

      if (reassignmentsBySubscriptionId.has(subscription.id)) {
        continue;
      }

      reassignmentsBySubscriptionId.set(subscription.id, {
        subscriptionId: subscription.id,
        fromCategoryId: subscription.categoryId,
        toCategoryId: reassignment.toCategoryId,
        reason: normalizeReason(reassignment.reason),
        enabled: true,
      });
    }

    const mergesBySourceId = new Map<string, CategoryAiOptimizationMerge>();

    for (const merge of generated.merges) {
      if (!categoryIdSet.has(merge.sourceCategoryId)) {
        continue;
      }

      if (!categoryIdSet.has(merge.targetCategoryId)) {
        continue;
      }

      if (merge.sourceCategoryId === merge.targetCategoryId) {
        continue;
      }

      if (mergesBySourceId.has(merge.sourceCategoryId)) {
        continue;
      }

      // Skip merge chains to keep apply deterministic (A->B and B->C).
      if (mergesBySourceId.has(merge.targetCategoryId)) {
        continue;
      }

      const affectedCount = subscriptions.filter(
        (subscription) => subscription.categoryId === merge.sourceCategoryId,
      ).length;

      mergesBySourceId.set(merge.sourceCategoryId, {
        sourceCategoryId: merge.sourceCategoryId,
        targetCategoryId: merge.targetCategoryId,
        affectedCount,
        reason: normalizeReason(merge.reason),
        enabled: true,
      });
    }

    const consumedContext = await deps.aiUsageService.consume(
      userId,
      aiContext,
      aiUsageDeps,
    );

    if (!consumedContext) {
      throw new CategoryAiQuotaExceededError();
    }

    return {
      model: COMPARATOR_AI_MODEL,
      sourceCount,
      generatedAt: new Date().toISOString(),
      quota: toQuota(deps.aiUsageService.toQuotaDto(consumedContext)),
      reassignments: Array.from(reassignmentsBySubscriptionId.values()),
      merges: Array.from(mergesBySourceId.values()),
    };
  }

  static async applyCategories(
    userId: string,
    payload: CategoryAiApplyInput,
    deps: CategoryAiServiceDeps = defaultDeps,
  ): Promise<CategoryAiApplyResponse> {
    const aiUsageDeps = toAiUsageDeps(deps);
    const [categories, subscriptions, planId, aiContext] = await Promise.all([
      deps.categoryRepository.findByUserId(userId),
      deps.subscriptionRepository.findByUserId(userId),
      deps.userService.getPlanId(userId),
      deps.aiUsageService.getContext(userId, aiUsageDeps),
    ]);

    const suggestions = payload.suggestions.filter(
      (suggestion) => suggestion.enabled,
    );
    if (suggestions.length === 0) {
      return {
        createdCount: 0,
        assignedCount: 0,
        skippedExistingCount: 0,
        quota: toQuota(deps.aiUsageService.toQuotaDto(aiContext)),
      };
    }

    const plan = getPlanById(planId);
    const maxCategories = plan.limits.maxCategories;

    let createdCount = 0;
    let assignedCount = 0;
    let skippedExistingCount = 0;

    const uncategorizedSubscriptionIds = new Set(
      subscriptions
        .filter((subscription) => subscription.categoryId === null)
        .map((subscription) => subscription.id),
    );

    const categoryIdByName = new Map<string, string>(
      categories.map((category) => [
        normalizeCategoryName(category.name),
        category.id,
      ]),
    );

    for (const suggestion of suggestions) {
      const normalizedName = normalizeCategoryName(suggestion.name);
      if (!normalizedName) {
        continue;
      }

      let categoryId = categoryIdByName.get(normalizedName) ?? null;

      if (categoryId) {
        skippedExistingCount += 1;
      } else {
        if (
          maxCategories !== null &&
          categories.length + createdCount >= maxCategories
        ) {
          throw new CategoryLimitReachedError();
        }

        const created = await deps.categoryRepository.create({
          userId,
          name: suggestion.name.trim(),
          emoji: ALLOWED_EMOJIS.has(suggestion.emoji)
            ? suggestion.emoji
            : DEFAULT_CATEGORY_EMOJI,
        });

        categoryId = created.id;
        categoryIdByName.set(normalizedName, created.id);
        createdCount += 1;
      }

      const uniqueSubscriptionIds = Array.from(
        new Set(suggestion.subscriptionIds),
      );

      for (const subscriptionId of uniqueSubscriptionIds) {
        if (!uncategorizedSubscriptionIds.has(subscriptionId)) {
          continue;
        }

        await deps.subscriptionRepository.update(subscriptionId, {
          categoryId,
        });
        uncategorizedSubscriptionIds.delete(subscriptionId);
        assignedCount += 1;
      }
    }

    return {
      createdCount,
      assignedCount,
      skippedExistingCount,
      quota: toQuota(deps.aiUsageService.toQuotaDto(aiContext)),
    };
  }

  static async applyOptimization(
    userId: string,
    payload: CategoryAiOptimizeApplyInput,
    deps: CategoryAiServiceDeps = defaultDeps,
  ): Promise<CategoryAiOptimizeApplyResponse> {
    const aiUsageDeps = toAiUsageDeps(deps);

    const [categories, subscriptions, aiContext] = await Promise.all([
      deps.categoryRepository.findByUserId(userId),
      deps.subscriptionRepository.findByUserId(userId),
      deps.aiUsageService.getContext(userId, aiUsageDeps),
    ]);

    const categoryIds = new Set(categories.map((category) => category.id));
    const subscriptionById = new Map(
      subscriptions.map((subscription) => [subscription.id, subscription]),
    );

    const explicitReassignments = new Map<string, string>();

    for (const reassignment of payload.reassignments) {
      if (!reassignment.enabled) {
        continue;
      }

      const subscription = subscriptionById.get(reassignment.subscriptionId);
      if (!subscription) {
        continue;
      }

      if (!categoryIds.has(reassignment.toCategoryId)) {
        continue;
      }

      if (subscription.categoryId === reassignment.toCategoryId) {
        continue;
      }

      if (!explicitReassignments.has(subscription.id)) {
        explicitReassignments.set(subscription.id, reassignment.toCategoryId);
      }
    }

    const mergeTargetBySource = new Map<string, string>();

    for (const merge of payload.merges) {
      if (!merge.enabled) {
        continue;
      }

      if (!categoryIds.has(merge.sourceCategoryId)) {
        continue;
      }

      if (!categoryIds.has(merge.targetCategoryId)) {
        continue;
      }

      if (merge.sourceCategoryId === merge.targetCategoryId) {
        continue;
      }

      if (mergeTargetBySource.has(merge.sourceCategoryId)) {
        continue;
      }

      if (mergeTargetBySource.has(merge.targetCategoryId)) {
        continue;
      }

      mergeTargetBySource.set(merge.sourceCategoryId, merge.targetCategoryId);
    }

    if (explicitReassignments.size === 0 && mergeTargetBySource.size === 0) {
      return {
        reassignedCount: 0,
        mergedCount: 0,
        deletedEmptyCategoriesCount: 0,
        quota: toQuota(deps.aiUsageService.toQuotaDto(aiContext)),
      };
    }

    const nextCategoryBySubscriptionId = new Map(
      subscriptions.map((subscription) => [
        subscription.id,
        subscription.categoryId,
      ]),
    );

    for (const [
      subscriptionId,
      targetCategoryId,
    ] of explicitReassignments.entries()) {
      nextCategoryBySubscriptionId.set(subscriptionId, targetCategoryId);
    }

    for (const subscription of subscriptions) {
      if (explicitReassignments.has(subscription.id)) {
        continue;
      }

      const currentCategoryId = subscription.categoryId;
      if (!currentCategoryId) {
        continue;
      }

      const fallbackTarget = mergeTargetBySource.get(currentCategoryId);
      if (!fallbackTarget) {
        continue;
      }

      if (fallbackTarget === currentCategoryId) {
        continue;
      }

      nextCategoryBySubscriptionId.set(subscription.id, fallbackTarget);
    }

    let reassignedCount = 0;
    let deletedEmptyCategoriesCount = 0;

    const runInTransaction =
      deps.runInTransaction ?? defaultDeps.runInTransaction!;

    await runInTransaction(async (tx) => {
      for (const subscription of subscriptions) {
        const nextCategoryId =
          nextCategoryBySubscriptionId.get(subscription.id) ?? null;
        if (nextCategoryId === subscription.categoryId) {
          continue;
        }

        await deps.subscriptionRepository.update(subscription.id, {
          categoryId: nextCategoryId,
        });
        reassignedCount += 1;
      }

      const assignedCategoryIds = new Set(
        nextCategoryBySubscriptionId.values(),
      );

      for (const sourceCategoryId of mergeTargetBySource.keys()) {
        if (assignedCategoryIds.has(sourceCategoryId)) {
          continue;
        }

        await deps.categoryRepository.delete(
          sourceCategoryId,
          tx as unknown as typeof db,
        );
        deletedEmptyCategoriesCount += 1;
      }
    });

    return {
      reassignedCount,
      mergedCount: mergeTargetBySource.size,
      deletedEmptyCategoriesCount,
      quota: toQuota(deps.aiUsageService.toQuotaDto(aiContext)),
    };
  }
}
