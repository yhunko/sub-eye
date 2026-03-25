import { createQueryKeys } from "@lukemorales/query-key-factory";

export const analyticsQueryKeys = createQueryKeys("analytics", {
  dashboard: (filters: { userId: string; orgId?: string | null }) =>
    [filters.userId, filters.orgId ?? undefined] as const,
  monthlySpend: (filters: { userId: string; orgId?: string | null }) =>
    [filters.userId, filters.orgId ?? undefined] as const,
  weeklyRenewals: null,
});
