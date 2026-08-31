import type { SubscriptionDto, UpdateSubscriptionInput } from "@subeye/model";
import { updateSubscription } from "@subeye/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { invalidateSubscriptionData } from "./invalidate";

type UpdateSubscriptionVars = {
  id: string;
  changes: UpdateSubscriptionInput;
};

export function useUpdateSubscription() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: UpdateSubscriptionVars): Promise<SubscriptionDto> =>
      updateSubscription(localPorts, vars.id, vars.changes),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
}
