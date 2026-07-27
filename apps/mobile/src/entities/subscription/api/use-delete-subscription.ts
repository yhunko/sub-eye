import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { buildOptimisticSubscriptionMutation } from "../model/optimistic-mutation";

export function useDeleteSubscription() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<{ id: string }>({
      client,
      subscriptionId: (vars) => vars.id,
      removes: true,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      mutationFn: async (vars) => {
        const response = await apiClient.api.subscriptions[":id"].$delete({
          param: { id: vars.id },
        });
        assertOk(response);
        // DELETE answers { success: true }, not a subscription — there is
        // nothing to write back, and the row is already gone from the caches.
        return null;
      },
    }),
  );
}
