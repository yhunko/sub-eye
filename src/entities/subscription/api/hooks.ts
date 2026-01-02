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
  user: (userId: string) => ({
    queryKey: [userId],
    contextQueries: {
      list: (params?: GetSubscriptionsParams) => [params],
    },
  }),
});

const useInvalidateSubscriptionsData = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return () => {
    if (!user?.id) return;

    const keys = [
      subscriptionsQueryKeys.user(user.id)._ctx.list._def,
      analyticsQueryKeys.user(user.id)._ctx.dashboard.queryKey,
    ];

    return Promise.all(
      keys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    );
  };
};

export const useSubscriptions = ({
  options,
  params,
}: QueryHook<SubscriptionDto[], GetSubscriptionsParams>) => {
  const { user, isLoaded, isSignedIn } = useUser();

  return useQuery({
    queryKey: subscriptionsQueryKeys.user(user?.id as string)._ctx.list(params)
      .queryKey,
    queryFn: async () => {
      return await getSubscriptionsAction(params);
    },
    enabled: isSignedIn && isLoaded,
    ...options,
  });
};

export const useAddSubscription = ({
  options,
}: MutationHook<SubscriptionSchema, AddSubscriptionParams> = {}) => {
  const invalidateSubscriptionData = useInvalidateSubscriptionsData();

  return useMutation({
    mutationFn: async (params) => {
      return await addSubscriptionAction(params);
    },
    async onSuccess() {
      return invalidateSubscriptionData();
    },
    ...options,
  });
};

export const useDeleteSubscription = ({
  options,
}: MutationHook<void, number> = {}) => {
  const invalidateSubscriptionData = useInvalidateSubscriptionsData();

  return useMutation({
    mutationFn: async (id) => {
      return await deleteSubscriptionAction(id);
    },
    async onSuccess() {
      return invalidateSubscriptionData();
    },
    ...options,
  });
};
