import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook, MutationHook } from "@/shared/lib/react-query";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AddSubscriptionParams,
  GetSubscriptionsParams,
  GetSubscriptionParams,
} from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";
import {
  getSubscriptionsAction,
  addSubscriptionAction,
  deleteSubscriptionAction,
  getSubscriptionAction,
  updateSubscriptionAction,
} from "./actions";
import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";
import { analyticsQueryKeys } from "../../analytics/api/hooks";
import { useUser } from "@clerk/nextjs";

export const subscriptionsQueryKeys = createQueryKeys("subscriptions", {
  user: (userId: string) => ({
    queryKey: [userId],
    contextQueries: {
      list: (params?: GetSubscriptionsParams) => [params],
      detail: ({ id, ...params }: GetSubscriptionParams) => [id, params],
    },
  }),
});

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
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (params) => {
      return await addSubscriptionAction(params);
    },
    async onSuccess() {
      const promises: Promise<unknown>[] = [];

      if (user) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: subscriptionsQueryKeys.user(user.id)._ctx.list._def,
          }),
        );
        promises.push(
          queryClient.invalidateQueries({
            queryKey: analyticsQueryKeys.user(user.id)._ctx.monthlySpend
              .queryKey,
          }),
        );
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

export const useDeleteSubscription = ({
  options,
}: MutationHook<void, string> = {}) => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (id) => {
      return await deleteSubscriptionAction(id);
    },
    async onSuccess(_, id) {
      const promises: Promise<unknown>[] = [];

      if (user) {
        promises.push(
          queryClient.cancelQueries({
            queryKey: subscriptionsQueryKeys.user(user.id)._ctx.detail({ id })
              .queryKey,
          }),
        );
        promises.push(
          queryClient.invalidateQueries({
            queryKey: subscriptionsQueryKeys.user(user.id)._ctx.list._def,
          }),
        );
        promises.push(
          queryClient.invalidateQueries({
            queryKey: analyticsQueryKeys.user(user.id)._ctx.monthlySpend
              .queryKey,
          }),
        );
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

export const useSubscription = ({
  params,
  options,
}: QueryHook<SubscriptionDto, GetSubscriptionParams>) => {
  const { user, isLoaded, isSignedIn } = useUser();

  return useQuery({
    queryKey: subscriptionsQueryKeys
      .user(user?.id as string)
      ._ctx.detail(params).queryKey,
    queryFn: async () => {
      return await getSubscriptionAction(params);
    },
    enabled: isSignedIn && isLoaded,
    ...options,
  });
};

export const useUpdateSubscription = ({
  options,
}: MutationHook<
  SubscriptionDto,
  { id: string; params: Partial<AddSubscriptionParams> }
> = {}) => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({ id, params }) => {
      return await updateSubscriptionAction(id, params);
    },
    async onSuccess(subscription) {
      if (user) {
        queryClient.setQueryData(
          subscriptionsQueryKeys
            .user(user.id)
            ._ctx.detail({ id: subscription.id }).queryKey,
          subscription,
        );

        return await Promise.all([
          queryClient.invalidateQueries({
            queryKey: subscriptionsQueryKeys.user(user.id)._ctx.list._def,
          }),
          queryClient.invalidateQueries({
            queryKey: analyticsQueryKeys.user(user.id)._ctx.monthlySpend
              .queryKey,
          }),
          queryClient.invalidateQueries({
            queryKey: analyticsQueryKeys.user(user.id)._ctx.dashboard.queryKey,
          }),
        ]);
      }
    },
    ...options,
  });
};
