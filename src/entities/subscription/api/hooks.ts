import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook, MutationHook } from "@/shared/lib/react-query";
import { SubscriptionDto, AddSubscriptionDto } from "@/shared/lib/db";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSubscriptions, addSubscription } from "./actions";

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

export const useAddSubscription = ({
  options,
}: MutationHook<SubscriptionDto[] | null, AddSubscriptionDto> = {}) => {
  return useMutation({
    mutationFn: async (params) => {
      return await addSubscription(params);
    },
    ...options,
  });
};
