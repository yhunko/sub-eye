import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook, MutationHook } from "@/shared/lib/react-query";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AddSubscriptionParams,
  GetSubscriptionsParams,
} from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";
import {
  getSubscriptionsAction,
  addSubscriptionAction,
  deleteSubscriptionAction,
} from "./actions";
import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  list: (params?: GetSubscriptionsParams) => [params],
});

export const useSubscriptions = ({
  options,
  params,
}: QueryHook<SubscriptionDto[], GetSubscriptionsParams>) => {
  return useQuery({
    queryKey: subscriptionsQueryKeys.list(params).queryKey,
    queryFn: async () => {
      return await getSubscriptionsAction(params);
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

export const useDeleteSubscription = ({
  options,
}: MutationHook<void, number> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return await deleteSubscriptionAction(id);
    },
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
    },
    ...options,
  });
};
