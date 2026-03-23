import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { AddSubscriptionInput, SubscriptionDto } from "shared";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { analyticsQueryKeys } from "../../analytics";
import { billingQueryKeys } from "@/entities/billing";
import { track } from "@/shared/lib/analytics";

export const useCreateSubscription = ({
  options,
}: MutationHook<SubscriptionDto, AddSubscriptionInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.api.subscriptions.$post({
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess(_data, variables) {
      track("subscription_created", {
        billing_period: variables.period ?? "month",
        currency: variables.currency,
      });
      void queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
      // Invalidate both personal and org usage queries
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.orgUsage._def,
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsQueryKeys._def,
      });
    },
    ...options,
  });
};
