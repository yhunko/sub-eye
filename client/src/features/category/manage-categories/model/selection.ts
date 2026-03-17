export const toggleCategorySelection = (
  selectedIds: Set<string>,
  id: string,
): Set<string> => {
  const next = new Set(selectedIds);

  if (next.has(id)) {
    next.delete(id);
    return next;
  }

  next.add(id);
  return next;
};

export const selectAllCategoryIds = (ids: readonly string[]): Set<string> =>
  new Set(ids);

export const clearCategorySelection = (): Set<string> => new Set<string>();

export const pruneCategorySelection = (
  selectedIds: Set<string>,
  availableIds: readonly string[],
): Set<string> => {
  const available = new Set(availableIds);
  const next = new Set<string>();

  for (const id of selectedIds) {
    if (available.has(id)) {
      next.add(id);
    }
  }

  return next;
};

export const shouldShowBulkDeleteToolbar = (selectedCount: number): boolean =>
  selectedCount >= 2;
