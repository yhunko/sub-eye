import { createQueryKeys } from "@lukemorales/query-key-factory";

export const analyticsQueryKeys = createQueryKeys("analytics", {
  dashboard: (filters: { userId: string }) => [filters.userId],
  monthlySummary: (filters: { userId: string }) => [filters.userId],
  weeklyRenewals: (filters: { userId: string }) => [filters.userId],
});
