import { createQueryKeys } from "@lukemorales/query-key-factory";
import { UseSubscriptionsParams } from "./params";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  list: (filters: UseSubscriptionsParams) => [
    filters.userId,
    filters.queryParams,
  ],
  detail: (filters: { userId: string; subscriptionId: string }) => [
    filters.userId,
    filters.subscriptionId,
  ],
  usage: (filters: { userId: string }) => [filters.userId],
});
