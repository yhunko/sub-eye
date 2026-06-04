export {
  clearSelection as clearCategorySelection,
  pruneSelection as pruneCategorySelection,
  selectAll as selectAllCategoryIds,
  toggleSelection as toggleCategorySelection,
} from "@/shared/lib/selection";

export const shouldShowBulkDeleteToolbar = (selectedCount: number): boolean =>
  selectedCount >= 2;
