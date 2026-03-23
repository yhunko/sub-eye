export {
  toggleSelection as toggleCategorySelection,
  selectAll as selectAllCategoryIds,
  clearSelection as clearCategorySelection,
  pruneSelection as pruneCategorySelection,
} from "@/shared/lib/selection";

export const shouldShowBulkDeleteToolbar = (selectedCount: number): boolean =>
  selectedCount >= 2;
