import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook, MutationHook } from "@/shared/lib/react-query";
import { SubscriptionDto } from "@/shared/lib/db";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSubscriptions, addSubscription } from "./actions";
import { AddSubscriptionParams } from "./params";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  list: null,
});

export const useSubscriptions = ({ options }: QueryHook<SubscriptionDto[]>) => {
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
}: MutationHook<SubscriptionDto[] | null, AddSubscriptionParams> = {}) => {
  return useMutation({
    mutationFn: async (params) => {
      return await addSubscription(params);
    },
    ...options,
  });
};
