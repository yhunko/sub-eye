import { createQueryKeys } from "@lukemorales/query-key-factory";
import { UseSubscriptionsParams } from "./params";

export const subscriptionsKeys = createQueryKeys("subscriptions", {
  list: (filters: UseSubscriptionsParams) => [
    filters.userId,
    filters.queryParams,
  ],
  detail: (filters: { userId: string; subscriptionId: string }) => [
    filters.userId,
    filters.subscriptionId,
  ],
});
