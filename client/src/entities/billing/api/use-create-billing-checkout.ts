import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BillingCheckoutResponse } from "shared";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import { billingQueryKeys } from "../model/query-keys";
import { track } from "@/shared/lib/analytics";

export const useCreateBillingCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<BillingCheckoutResponse> => {
      const res = await apiClient.api.billing.checkout.$post();
      assertOk(res);
      return res.json();
    },
    onSuccess: async () => {
      track("upgrade_checkout_started");
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    },
  });
};
