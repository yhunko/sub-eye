import { createQueryKeys } from "@lukemorales/query-key-factory";

export const categoriesQueryKeys = createQueryKeys("categories", {
  list: (filters: { userId: string; orgId?: string | null }) => [
    filters.userId,
    filters.orgId ?? undefined,
  ],
  detail: (filters: {
    userId: string;
    categoryId: string;
    orgId?: string | null;
  }) => [filters.userId, filters.orgId ?? undefined, filters.categoryId],
});
