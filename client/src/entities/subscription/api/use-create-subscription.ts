import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { AddSubscriptionInput, SubscriptionDto } from "shared";
import { apiClient } from "@/shared/api/client";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { analyticsQueryKeys } from "../../analytics";
import { billingQueryKeys } from "@/entities/billing";

export const useCreateSubscription = ({
  options,
}: MutationHook<SubscriptionDto, AddSubscriptionInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.api.subscriptions.$post({
        json: payload,
      });
      if (!res.ok) {
        throw new Error("Failed to create subscription");
      }
      return res.json();
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsQueryKeys._def,
      });
    },
    ...options,
  });
};
