import type { AddSubscriptionInput, SubscriptionDto } from "@subeye/model";
import { addSubscription } from "@subeye/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { invalidateSubscriptionData } from "./invalidate";
import { subscriptionKeys } from "./list";

/**
 * What the form collects. The three fields it does not are supplied below —
 * they used to arrive as `AddSubscriptionSchema` defaults applied by the
 * server's validator, and with no request to parse there is nothing else left
 * to apply them. Omitting them writes `undefined` into the document, where
 * JSON.stringify drops the key entirely.
 */
type CreateSubscriptionVars = Omit<
  AddSubscriptionInput,
  "autoPaid" | "notes" | "willBeCancelledAt"
>;

export function useCreateSubscription() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: CreateSubscriptionVars): Promise<SubscriptionDto> =>
      addSubscription(localPorts, {
        autoPaid: false,
        notes: null,
        willBeCancelledAt: null,
        ...vars,
      }),
    onError: notifyWriteFailed,
    onSuccess: (created) => {
      // Seed the detail entry so opening the new subscription is instant. It is
      // the one write with no entry to invalidate — the id did not exist yet.
      client.setQueryData(subscriptionKeys.detail(created.id), created);
    },
    onSettled: () => invalidateSubscriptionData(client),
  });
}
