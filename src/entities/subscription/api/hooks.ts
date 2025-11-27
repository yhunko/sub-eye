import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook } from "@/shared/lib/react-query";
import { SubscriptionDto } from "@/shared/lib/db";
import { useQuery } from "@tanstack/react-query";
import { getSubscriptions } from "./actions";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  list: null,
});

export const useSubscriptions = ({
  options,
}: QueryHook<SubscriptionDto[] | null>) => {
  return useQuery({
    queryKey: subscriptionsQueryKeys.list.queryKey,
    queryFn: async () => {
      return await getSubscriptions();
    },
    ...options,
  });
};
