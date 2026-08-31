import type { CancelSubscriptionMode, SubscriptionDto } from "@subeye/model";
import {
  cancelSubscription,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
} from "@subeye/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { invalidateSubscriptionData } from "./invalidate";

type PauseSubscriptionVars = { id: string; resumeAt: string | null };

/**
 * Pause is per-occurrence, not per-subscription: charges inside
 * [pausedAt, resumeAt) stop counting, and the first one at or after resumeAt
 * counts in full. A null resumeAt pauses indefinitely until resumed by hand.
 */
export function usePauseSubscription() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: PauseSubscriptionVars): Promise<SubscriptionDto> =>
      pauseSubscription(localPorts, vars.id, vars.resumeAt),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
}

export function useResumeSubscription() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: string }): Promise<SubscriptionDto> =>
      resumeSubscription(localPorts, vars.id),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
}

type CancelSubscriptionVars = { id: string; mode: CancelSubscriptionMode };

export function useCancelSubscription() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: CancelSubscriptionVars): Promise<SubscriptionDto> =>
      cancelSubscription(localPorts, vars.id, vars.mode),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
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

  return useMutation({
    mutationFn: (vars: {
      id: string;
      paymentDate?: string;
    }): Promise<SubscriptionDto> =>
      renewSubscription(localPorts, vars.id, vars.paymentDate ?? null),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
}
