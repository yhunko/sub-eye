import type { CancelSubscriptionMode, SubscriptionDto } from "@subeye/model";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { buildOptimisticSubscriptionMutation } from "../model/optimistic-mutation";

/**
 * The four lifecycle transitions. Each patches `status` so the badge flips on
 * the same frame as the tap.
 *
 * None of them patches `allowedActions`: which actions become legal is the
 * server's call (`getAllowedActions`), and re-deriving it here is exactly the
 * duplicated state machine that DTO field exists to prevent. It arrives correct
 * with the response, well before the user can open the action sheet again.
 */

type PauseSubscriptionVars = { id: string; resumeAt: string | null };

/**
 * Pause is per-occurrence, not per-subscription: charges inside
 * [pausedAt, resumeAt) stop counting, and the first one at or after resumeAt
 * counts in full. A null resumeAt pauses indefinitely until resumed by hand.
 */
export function usePauseSubscription() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<PauseSubscriptionVars>({
      client,
      subscriptionId: (vars) => vars.id,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      patch: (vars) => ({
        status: "paused",
        pausedAt: new Date().toISOString(),
        resumeAt: vars.resumeAt,
      }),
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].pause.$post({
          param: { id: vars.id },
          json: { resumeAt: vars.resumeAt },
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}

export function useResumeSubscription() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<{ id: string }>({
      client,
      subscriptionId: (vars) => vars.id,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      // The payment anchor rolls forward on the server; clearing the pause state
      // is all the badge needs until the real row lands.
      patch: () => ({ status: "active", pausedAt: null, resumeAt: null }),
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].resume.$post({
          param: { id: vars.id },
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}

type CancelSubscriptionVars = {
  id: string;
  mode: CancelSubscriptionMode;
};

export function useCancelSubscription() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<CancelSubscriptionVars>({
      client,
      subscriptionId: (vars) => vars.id,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      // "periodEnd" keeps billing until the paid period closes -> `cancelling`.
      // "immediate" stops it now -> `cancelled`. The exact willBeCancelledAt is
      // the server's to compute; the status flip is what the badge shows.
      patch: (vars) => ({
        status: vars.mode === "immediate" ? "cancelled" : "cancelling",
      }),
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].cancel.$post({
          param: { id: vars.id },
          json: { mode: vars.mode },
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}

/**
 * Un-cancel: clears the pending cancellation and restores normal billing.
 *
 * `paymentDate` re-anchors the billing cycle to the day the subscription really
 * started again, and is only sent for a subscription that has ENDED. A
 * still-winding-down one never stopped billing, so moving its anchor would
 * shift a cycle that was never interrupted.
 */
export function useRenewSubscription() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<{ id: string; paymentDate?: string }>({
      client,
      subscriptionId: (vars) => vars.id,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      patch: (vars) => ({
        status: "active",
        willBeCancelledAt: null,
        ...(vars.paymentDate ? { paymentDate: vars.paymentDate } : {}),
      }),
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].renew.$post({
          param: { id: vars.id },
          json: { paymentDate: vars.paymentDate ?? null },
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}
