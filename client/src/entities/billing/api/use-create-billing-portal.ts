import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BillingPortalResponse } from "shared";
import { apiClient } from "@/shared/api/client";
import { billingQueryKeys } from "../model/query-keys";
import { track } from "@/shared/lib/analytics";

export const useCreateBillingPortal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<BillingPortalResponse> => {
      const res = await apiClient.api.billing.portal.$post();

      if (!res.ok) {
        throw new Error("Failed to create Paddle customer portal session");
      }

      return res.json();
    },
    onSuccess: async () => {
      track("billing_portal_opened");
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    },
  });
};
