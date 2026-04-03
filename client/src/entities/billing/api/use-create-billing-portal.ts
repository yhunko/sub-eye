import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BillingPortalResponse } from "shared";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import { billingQueryKeys } from "../model/query-keys";

export const useCreateBillingPortal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<BillingPortalResponse> => {
      const res = await apiClient.api.billing.portal.$post();
      assertOk(res);
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
