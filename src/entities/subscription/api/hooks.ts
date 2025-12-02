import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook, MutationHook } from "@/shared/lib/react-query";
import { SubscriptionSchema } from "@/shared/lib/db";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AddSubscriptionParams } from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";
import { getSubscriptionsAction, addSubscriptionAction } from "./actions";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  list: null,
});

export const useSubscriptions = ({
  options,
}: QueryHook<SubscriptionSchema[]>) => {
  return useQuery({
    queryKey: subscriptionsQueryKeys.list.queryKey,
    queryFn: async () => {
      return await getSubscriptionsAction();
    },
    ...options,
  });
};

export const useAddSubscription = ({
  options,
}: MutationHook<SubscriptionDto, AddSubscriptionParams> = {}) => {
  return useMutation({
    mutationFn: async (params) => {
      return await addSubscriptionAction(params);
    },
    ...options,
  });
};
