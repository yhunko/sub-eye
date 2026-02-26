import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import { apiClient } from "@/shared/api/client";
import { subscriptionsQueryKeys } from "../model/query-keys";

export type DeleteSubscriptionHistoryItemParams = {
  subscriptionId: string;
  historyId: string;
};

export const useDeleteSubscriptionHistoryItem = ({
  options,
}: MutationHook<void, DeleteSubscriptionHistoryItemParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ subscriptionId, historyId }) => {
      const res = await apiClient.api.subscriptions[":id"].history[
        ":historyId"
      ].$delete({
        param: { id: subscriptionId, historyId },
      });

      if (!res.ok) {
        throw new Error("Failed to delete subscription history item");
      }
    },
    onSuccess: async (_data, variables) => {
      if (!userId) {
        await queryClient.invalidateQueries({
          queryKey: subscriptionsQueryKeys.history._def,
          refetchType: "active",
        });
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.history({
          userId,
          subscriptionId: variables.subscriptionId,
        }).queryKey,
        refetchType: "active",
      });
    },
  });
};
