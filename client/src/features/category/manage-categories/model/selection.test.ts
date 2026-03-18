import { describe, expect, it } from "bun:test";
import {
  clearCategorySelection,
  pruneCategorySelection,
  selectAllCategoryIds,
  shouldShowBulkDeleteToolbar,
  toggleCategorySelection,
} from "./selection";

describe("category selection model", () => {
  it("toggles category id selection", () => {
    const selected = new Set<string>(["cat_1"]);

    const withSecond = toggleCategorySelection(selected, "cat_2");
    const withoutFirst = toggleCategorySelection(withSecond, "cat_1");

    expect(Array.from(withSecond)).toEqual(["cat_1", "cat_2"]);
    expect(Array.from(withoutFirst)).toEqual(["cat_2"]);
  });

  it("selects all ids and clears selection", () => {
    const all = selectAllCategoryIds(["cat_1", "cat_2", "cat_3"]);
    const cleared = clearCategorySelection();

    expect(Array.from(all)).toEqual(["cat_1", "cat_2", "cat_3"]);
    expect(cleared.size).toBe(0);
  });

  it("prunes removed ids when available categories change", () => {
    const pruned = pruneCategorySelection(
      new Set(["cat_1", "cat_2", "cat_missing"]),
      ["cat_2", "cat_3"],
    );

    expect(Array.from(pruned)).toEqual(["cat_2"]);
  });

  it("shows floating bulk toolbar only when 2+ items selected", () => {
    expect(shouldShowBulkDeleteToolbar(0)).toBeFalse();
    expect(shouldShowBulkDeleteToolbar(1)).toBeFalse();
    expect(shouldShowBulkDeleteToolbar(2)).toBeTrue();
    expect(shouldShowBulkDeleteToolbar(3)).toBeTrue();
  });
});
