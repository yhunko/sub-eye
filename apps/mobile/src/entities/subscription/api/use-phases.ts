import type { StartPhaseInput, SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";
import { notifyWriteFailed } from "@/shared/ui/notify";
import {
  buildOptimisticSubscriptionMutation,
  type SubscriptionPatch,
} from "../model/optimistic-mutation";

export type StartPhaseVars = { id: string; phase: StartPhaseInput };

/**
 * What a new phase does to today's price.
 *
 * `trial` and `intro` begin immediately and revert on `endsAt`, so the price on
 * screen changes now. `scheduledChange` lands on a future date and leaves
 * today's price alone — patching it would show a rise the user is not paying yet.
 */
function phasePatch(phase: StartPhaseInput): SubscriptionPatch {
  if (phase.kind === "scheduledChange") return {};

  return {
    cost: phase.promoCost,
    ...(phase.currency ? { currency: phase.currency } : {}),
  };
}

export function useStartPhase() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<StartPhaseVars>({
      client,
      subscriptionId: (vars) => vars.id,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      patch: (vars) => phasePatch(vars.phase),
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].phases.$post({
          param: { id: vars.id },
          json: vars.phase,
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}

export type ApplyPhaseNowVars = {
  id: string;
  phaseId: string;
  cost: number;
  currency: string;
};

/**
 * "Make this pending change effective now" — the trial ended early, or the price
 * rise landed ahead of its date. The server closes the preceding phase, pulls
 * startsAt to now, stamps `appliedAt` and copies the price onto the subscription
 * row. The caller passes the phase's own cost so the hero price updates on the
 * same frame as the tap.
 */
export function useApplyPhaseNow() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<ApplyPhaseNowVars>({
      client,
      subscriptionId: (vars) => vars.id,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      patch: (vars) => ({ cost: vars.cost, currency: vars.currency }),
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].phases[
          ":phaseId"
        ]["apply-now"].$post({
          param: { id: vars.id, phaseId: vars.phaseId },
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}

/** Drops a phase that has not taken effect. Today's price is untouched. */
export function useCancelPhase() {
  const client = useQueryClient();

  return useMutation(
    buildOptimisticSubscriptionMutation<{ id: string; phaseId: string }>({
      client,
      subscriptionId: (vars) => vars.id,
      affectsSpend: true,
      onFailure: notifyWriteFailed,
      mutationFn: async (vars): Promise<SubscriptionDto> => {
        const response = await apiClient.api.subscriptions[":id"].phases[
          ":phaseId"
        ].$delete({
          param: { id: vars.id, phaseId: vars.phaseId },
        });
        assertOk(response);
        return response.json();
      },
    }),
  );
}
