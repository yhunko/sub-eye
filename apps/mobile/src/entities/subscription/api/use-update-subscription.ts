import type { SubscriptionDto, UpdateSubscriptionInput } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { buildOptimisticSubscriptionMutation } from "../model/optimistic-mutation";

export type UpdateSubscriptionVars = {
  id: string;
  changes: UpdateSubscriptionInput;
};

export function useUpdateSubscription() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<UpdateSubscriptionVars>({
      client,
      subscriptionId: (vars) => vars.id,
      // Price, cycle and payment date all move money.
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      // Every editable field is a plain column, so the payload IS the optimistic
      // patch. nextPaymentDate is deliberately not guessed — the server
      // recomputes it from the anchor date, and onSuccess writes the real row back.
      patch: (vars) => vars.changes,
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].$patch({
          param: { id: vars.id },
          json: vars.changes,
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}
