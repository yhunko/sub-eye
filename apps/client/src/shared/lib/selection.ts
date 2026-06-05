export const toggleSelection = (
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

export const selectAll = (ids: readonly string[]): Set<string> => new Set(ids);

export const clearSelection = (): Set<string> => new Set<string>();

export const pruneSelection = (
  selectedIds: Set<string>,
  availableIds: readonly string[],
): Set<string> => {
  if (selectedIds.size === 0) return selectedIds;

  const available = new Set(availableIds);
  const next = new Set<string>();

  for (const id of selectedIds) {
    if (available.has(id)) {
      next.add(id);
    }
  }

  // Return the same reference if nothing was pruned — prevents unnecessary re-renders
  return next.size === selectedIds.size ? selectedIds : next;
};
