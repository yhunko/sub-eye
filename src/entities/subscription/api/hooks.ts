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
import { analyticsQueryKeys } from "../../analytics/api/hooks";
import { useUser } from "@clerk/nextjs";

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
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, user } = useUser();

  return useMutation({
    mutationFn: async (params) => {
      return await addSubscriptionAction(params);
    },
    async onSuccess() {
      if (isLoaded && isSignedIn) {
        return await queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.user(user.id)._ctx.dashboard.queryKey,
        });
      }
    },
    ...options,
  });
};

export const useDeleteSubscription = ({
  options,
}: MutationHook<void, number> = {}) => {
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, user } = useUser();

  return useMutation({
    mutationFn: async (id) => {
      return await deleteSubscriptionAction(id);
    },
    async onSuccess() {
      const promises: Promise<void>[] = [
        queryClient.invalidateQueries({
          queryKey: subscriptionsQueryKeys.list._def,
        }),
      ];

      if (isLoaded && isSignedIn) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: analyticsQueryKeys.user(user.id)._ctx.dashboard.queryKey,
          }),
        );
      }

      return await Promise.all(promises);
    },
    ...options,
  });
};
