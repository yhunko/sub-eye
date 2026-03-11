import { createQueryKeys } from "@lukemorales/query-key-factory";

export const comparatorQueryKeys = createQueryKeys("comparator", {
  quota: (filters: { userId: string }) => [filters.userId],
  aiQuota: (filters: { userId: string }) => [filters.userId],
  rates: (filters: { userId: string }) => [filters.userId],
  compare: null,
  analyze: null,
});
