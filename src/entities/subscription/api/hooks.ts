import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook, MutationHook } from "@/shared/lib/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AddSubscriptionParams } from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";
import { getSubscriptionsAction, addSubscriptionAction } from "./actions";
import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  list: null,
});

export const useSubscriptions = ({ options }: QueryHook<SubscriptionDto[]>) => {
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
}: MutationHook<SubscriptionSchema, AddSubscriptionParams> = {}) => {
  return useMutation({
    mutationFn: async (params) => {
      return await addSubscriptionAction(params);
    },
    ...options,
  });
};
