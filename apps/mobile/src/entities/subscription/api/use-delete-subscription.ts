import { deleteSubscription } from "@subeye/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { invalidateSubscriptionData } from "./invalidate";
import { subscriptionKeys } from "./list";

export function useDeleteSubscription() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string }): Promise<void> =>
      deleteSubscription(localPorts, vars.id),
    onError: notifyWriteFailed,
    onSuccess: (_result, vars) => {
      // Dropped, not invalidated: the row is gone, so a refetch of this key
      // would only throw SubscriptionNotFound at whatever is still mounted.
      client.removeQueries({
        queryKey: subscriptionKeys.detail(vars.id),
        exact: true,
      });
    },
    onSettled: () => invalidateSubscriptionData(client),
  });
}
