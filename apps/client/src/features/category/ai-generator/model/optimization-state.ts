import type {
  CategoryAiOptimizationMerge,
  CategoryAiOptimizationReassignment,
} from "@subeye/shared";

const mapByKey = <T extends { enabled?: boolean }>(
  items: T[],
  match: (item: T) => boolean,
  enabled: boolean,
): T[] => items.map((item) => (match(item) ? { ...item, enabled } : item));

export const toggleOptimizationReassignmentEnabled = (
  reassignments: CategoryAiOptimizationReassignment[],
  subscriptionId: string,
  enabled: boolean,
): CategoryAiOptimizationReassignment[] =>
  mapByKey(
    reassignments,
    (item) => item.subscriptionId === subscriptionId,
    enabled,
  );

export const toggleOptimizationMergeEnabled = (
  merges: CategoryAiOptimizationMerge[],
  sourceCategoryId: string,
  enabled: boolean,
): CategoryAiOptimizationMerge[] =>
  mapByKey(
    merges,
    (item) => item.sourceCategoryId === sourceCategoryId,
    enabled,
  );

export const buildOptimizationApplyInput = ({
  reassignments,
  merges,
}: {
  reassignments: CategoryAiOptimizationReassignment[];
  merges: CategoryAiOptimizationMerge[];
}) => {
  const seenSubscriptionIds = new Set<string>();
  const nextReassignments: CategoryAiOptimizationReassignment[] = [];

  for (const reassignment of reassignments) {
    if (!reassignment.enabled) {
      continue;
    }

    if (!reassignment.subscriptionId || !reassignment.toCategoryId) {
      continue;
    }

    if (seenSubscriptionIds.has(reassignment.subscriptionId)) {
      continue;
    }

    seenSubscriptionIds.add(reassignment.subscriptionId);
    nextReassignments.push(reassignment);
  }

  const seenSourceCategoryIds = new Set<string>();
  const seenTargetCategoryIds = new Set<string>();
  const nextMerges: CategoryAiOptimizationMerge[] = [];

  for (const merge of merges) {
    if (!merge.enabled) {
      continue;
    }

    if (!merge.sourceCategoryId || !merge.targetCategoryId) {
      continue;
    }

    if (merge.sourceCategoryId === merge.targetCategoryId) {
      continue;
    }

    if (seenSourceCategoryIds.has(merge.sourceCategoryId)) {
      continue;
    }

    // Prevent merge chains: keep a category as merge source at most once, and
    // never allow a previously merged target to become a source.
    if (seenSourceCategoryIds.has(merge.targetCategoryId)) {
      continue;
    }

    if (seenTargetCategoryIds.has(merge.sourceCategoryId)) {
      continue;
    }

    seenSourceCategoryIds.add(merge.sourceCategoryId);
    seenTargetCategoryIds.add(merge.targetCategoryId);
    nextMerges.push(merge);
  }

  return {
    reassignments: nextReassignments,
    merges: nextMerges,
  };
};

export const summarizeOptimizationSelection = ({
  reassignments,
  merges,
}: {
  reassignments: CategoryAiOptimizationReassignment[];
  merges: CategoryAiOptimizationMerge[];
}) => {
  const selectedReassignments = reassignments.filter((item) => item.enabled);
  const selectedMerges = merges.filter((item) => item.enabled);

  return {
    selectedReassignmentsCount: selectedReassignments.length,
    selectedMergesCount: selectedMerges.length,
    selectedMergeAffectedCount: selectedMerges.reduce(
      (total, merge) => total + merge.affectedCount,
      0,
    ),
  };
};
