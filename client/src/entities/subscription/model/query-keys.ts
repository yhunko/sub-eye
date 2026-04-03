import { createQueryKeys } from "@lukemorales/query-key-factory";
import type { UseSubscriptionsParams } from "./params";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  list: (filters: UseSubscriptionsParams & { orgId?: string | null }) => [
    filters.userId,
    filters.orgId ?? undefined,
    filters.queryParams,
  ],
  detail: (filters: {
    userId: string;
    subscriptionId: string;
    orgId?: string | null;
  }) => [filters.userId, filters.orgId ?? undefined, filters.subscriptionId],
  history: (filters: { userId: string; subscriptionId: string }) => [
    filters.userId,
    filters.subscriptionId,
    "history",
  ],
  usage: (filters: { userId: string }) => [filters.userId],
});
