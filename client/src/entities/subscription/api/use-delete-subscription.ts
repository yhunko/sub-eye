import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiVoidReturn, IdParam, SubscriptionDto } from "shared";
import { billingQueryKeys } from "@/entities/billing";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { analyticsQueryKeys } from "../../analytics";
import { subscriptionsQueryKeys } from "../model/query-keys";

export const useDeleteSubscription = ({
  options,
}: MutationHook<ApiVoidReturn, IdParam> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async (param) => {
      const res = await apiClient.api.subscriptions[":id"].$delete({ param });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      track("subscription_deleted");
      const { id } = variables;

      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys._def,
        });

        queryClient.removeQueries({
          queryKey: subscriptionsQueryKeys.detail({
            userId,
            subscriptionId: id,
          }).queryKey,
        });

        queryClient.setQueriesData<SubscriptionDto[]>(
          {
            queryKey: subscriptionsQueryKeys
              .list({
                userId,
                queryParams: {},
              })
              .queryKey.slice(0, 3),
          },
          (oldData) => {
            if (!oldData) return oldData;

            return oldData.filter((sub) => sub.id !== id);
          },
        );
      }
    },
    async onSettled() {
      await queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    },
  });
};
