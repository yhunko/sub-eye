import { createQueryKeys } from "@lukemorales/query-key-factory";

export const categoriesQueryKeys = createQueryKeys("categories", {
  list: (filters: { userId: string }) => [filters.userId],
  detail: (filters: { userId: string; categoryId: string }) => [
    filters.userId,
    filters.categoryId,
  ],
});
