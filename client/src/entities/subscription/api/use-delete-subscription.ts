import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import { IdParam, SubscriptionDto } from "shared";
import { apiClient } from "@/shared/api/client";
import { ApiVoidReturn } from "shared";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { analyticsQueryKeys } from "../../analytics";
import { billingQueryKeys } from "@/entities/billing";
import { track } from "@/shared/lib/analytics";

export const useDeleteSubscription = ({
  options,
}: MutationHook<ApiVoidReturn, IdParam> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async (param) => {
      const res = await apiClient.api.subscriptions[":id"].$delete({ param });
      if (!res.ok) {
        throw new Error("Failed to delete subscription");
      }
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
