import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BillingCheckoutResponse } from "shared";
import { apiClient } from "@/shared/api/client";
import { billingQueryKeys } from "../model/query-keys";

export const useCreateBillingCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<BillingCheckoutResponse> => {
      const res = await apiClient.api.billing.checkout.$post();

      if (!res.ok) {
        const errorResponse = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(
          errorResponse?.message ??
            "Failed to create Paddle checkout transaction",
        );
      }

      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    },
  });
};
