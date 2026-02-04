import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query/types";
import type {
  AddSubscriptionInput,
  SubscriptionDto,
} from "@shared/domains/subscription";
import { apiClient } from "@/shared/api/client";
import { subscriptionsQueryKeys } from "../model/query-keys";

export const useCreateSubscription = ({
  options,
}: MutationHook<SubscriptionDto, AddSubscriptionInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (payload) => {
      const res = await apiClient.api.subscriptions.$post({
        json: payload,
      });
      if (!res.ok) {
        throw new Error("Failed to create subscription");
      }
      return res.json();
    },
    async onSuccess() {
      await queryClient.refetchQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
    },
  });
};
