import type { StartPhaseInput, SubscriptionDto } from "@subeye/model";
import { applyPhaseNow, cancelPhase, startPhase } from "@subeye/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { invalidateSubscriptionData } from "./invalidate";

type StartPhaseVars = { id: string; phase: StartPhaseInput };

export function useStartPhase() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: StartPhaseVars): Promise<SubscriptionDto> =>
      startPhase(localPorts, vars.id, vars.phase),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
}

/**
 * "Make this pending change effective now" — the trial ended early, or the
 * price rise landed ahead of its date. Closes the preceding phase, pulls
 * startsAt to now, stamps `appliedAt` and copies the price onto the
 * subscription row.
 */
export function useApplyPhaseNow() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      id: string;
      phaseId: string;
    }): Promise<SubscriptionDto> =>
      applyPhaseNow(localPorts, vars.id, vars.phaseId),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
}

/** Drops a phase that has not taken effect. Today's price is untouched. */
export function useCancelPhase() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      id: string;
      phaseId: string;
    }): Promise<SubscriptionDto> =>
      cancelPhase(localPorts, vars.id, vars.phaseId),
    onError: notifyWriteFailed,
    onSettled: () => invalidateSubscriptionData(client),
  });
}
