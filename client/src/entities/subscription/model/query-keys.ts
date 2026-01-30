import { createQueryKeys } from "@lukemorales/query-key-factory";
import type { GetSubscriptionsParams } from "shared";

export const subscriptionsKeys = createQueryKeys("subscriptions", {
  list: (filters: { userId: string; params?: GetSubscriptionsParams }) => [
    filters.userId,
    filters.params,
  ],
  detail: (filters: { userId: string; subscriptionId: string }) => [
    filters.userId,
    filters.subscriptionId,
  ],
});
