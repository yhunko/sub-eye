import { describe, expect, it } from "bun:test";
import type {
  CategoryAiOptimizationMerge,
  CategoryAiOptimizationReassignment,
} from "shared";
import {
  buildOptimizationApplyInput,
  summarizeOptimizationSelection,
  toggleOptimizationMergeEnabled,
  toggleOptimizationReassignmentEnabled,
} from "./optimization-state";

const createReassignment = (
  overrides: Partial<CategoryAiOptimizationReassignment> = {},
): CategoryAiOptimizationReassignment => ({
  subscriptionId: "sub_1",
  fromCategoryId: "cat_a",
  toCategoryId: "cat_b",
  reason: "Better fit",
  enabled: true,
  ...overrides,
});

const createMerge = (
  overrides: Partial<CategoryAiOptimizationMerge> = {},
): CategoryAiOptimizationMerge => ({
  sourceCategoryId: "cat_a",
  targetCategoryId: "cat_b",
  affectedCount: 2,
  reason: "Duplicate categories",
  enabled: true,
  ...overrides,
});

describe("optimization-state", () => {
  it("toggles enabled state for specific reassignments and merges", () => {
    const reassignmentResult = toggleOptimizationReassignmentEnabled(
      [
        createReassignment({ subscriptionId: "sub_1", enabled: true }),
        createReassignment({ subscriptionId: "sub_2", enabled: true }),
      ],
      "sub_2",
      false,
    );

    const mergeResult = toggleOptimizationMergeEnabled(
      [
        createMerge({ sourceCategoryId: "cat_a", enabled: true }),
        createMerge({ sourceCategoryId: "cat_c", enabled: true }),
      ],
      "cat_c",
      false,
    );

    expect(reassignmentResult).toMatchObject([
      { subscriptionId: "sub_1", enabled: true },
      { subscriptionId: "sub_2", enabled: false },
    ]);

    expect(mergeResult).toMatchObject([
      { sourceCategoryId: "cat_a", enabled: true },
      { sourceCategoryId: "cat_c", enabled: false },
    ]);
  });

  it("builds apply payload with dedupe and merge-chain protection", () => {
    const payload = buildOptimizationApplyInput({
      reassignments: [
        createReassignment({ subscriptionId: "sub_1", toCategoryId: "cat_b" }),
        createReassignment({
          subscriptionId: "sub_1",
          toCategoryId: "cat_c",
          reason: "duplicate",
        }),
        createReassignment({ subscriptionId: "sub_2", enabled: false }),
      ],
      merges: [
        createMerge({ sourceCategoryId: "cat_a", targetCategoryId: "cat_b" }),
        createMerge({ sourceCategoryId: "cat_b", targetCategoryId: "cat_c" }),
        createMerge({ sourceCategoryId: "cat_d", targetCategoryId: "cat_d" }),
      ],
    });

    expect(payload.reassignments).toHaveLength(1);
    expect(payload.reassignments[0]).toMatchObject({
      subscriptionId: "sub_1",
      toCategoryId: "cat_b",
    });

    expect(payload.merges).toEqual([
      createMerge({ sourceCategoryId: "cat_a", targetCategoryId: "cat_b" }),
    ]);
  });

  it("summarizes selected impact counts", () => {
    const summary = summarizeOptimizationSelection({
      reassignments: [
        createReassignment({ enabled: true }),
        createReassignment({ subscriptionId: "sub_2", enabled: false }),
      ],
      merges: [
        createMerge({
          sourceCategoryId: "cat_a",
          affectedCount: 2,
          enabled: true,
        }),
        createMerge({
          sourceCategoryId: "cat_b",
          affectedCount: 3,
          enabled: true,
        }),
      ],
    });

    expect(summary).toEqual({
      selectedReassignmentsCount: 1,
      selectedMergesCount: 2,
      selectedMergeAffectedCount: 5,
    });
  });
});
