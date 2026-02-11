import { createQueryKeys } from "@lukemorales/query-key-factory";

export const analyticsQueryKeys = createQueryKeys("analytics", {
  dashboard: (filters: { userId: string }) => [filters.userId],
  monthlySpend: null,
  weeklyRenewals: null,
});
