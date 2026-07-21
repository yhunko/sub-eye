import type { SubscriptionDto } from "@subeye/shared";
import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { subscriptionKeys } from "../api/list";
import {
  invalidateSubscriptionCaches,
  patchSubscriptionCaches,
  removeSubscriptionFromCaches,
  restoreSubscriptionCaches,
  type SubscriptionCacheSnapshot,
  type SubscriptionPatch,
  snapshotSubscriptionCaches,
} from "./cache";

export type OptimisticMutationConfig<TVars> = {
  client: QueryClient;
  /** How to read the subscription id out of the mutation variables. */
  subscriptionId: (vars: TVars) => string;
  /** Resolves to the updated subscription, or null when the route returns none. */
  mutationFn: (vars: TVars) => Promise<SubscriptionDto | null>;
  /** The fields to show immediately, before the request leaves the device. */
  patch?: (vars: TVars) => SubscriptionPatch;
  /** Delete-style: drop the row from the caches instead of patching it. */
  removes?: boolean;
  /** Does this change what the user pays? Then the dashboard totals must revalidate. */
  affectsSpend?: boolean;
  /** Told about a failure only after the cache has been rolled back. */
  onFailure?: (error: Error) => void;
};

/**
 * The single write path for subscriptions. Every mutation in the app is built
 * here so that the four-callback optimistic contract is written once:
 *
 *  1. onMutate  — cancel in-flight reads, snapshot, then patch.
 *  2. onError   — restore the snapshot; the UI snaps back to the truth.
 *  3. onSuccess — overwrite with the server's row.
 *  4. onSettled — invalidate so the next read revalidates.
 *
 * It is a plain function returning options rather than a hook, so the rollback
 * path is testable by calling the callbacks directly — no renderer, no
 * renderHook, no test-utils dependency.
 */
export function buildOptimisticSubscriptionMutation<TVars>(
  config: OptimisticMutationConfig<TVars>,
): UseMutationOptions<
  SubscriptionDto | null,
  Error,
  TVars,
  SubscriptionCacheSnapshot
> {
  const {
    client,
    subscriptionId,
    mutationFn,
    patch,
    removes,
    affectsSpend,
    onFailure,
  } = config;

  return {
    mutationFn,

    async onMutate(vars) {
      const id = subscriptionId(vars);

      // Cancel BEFORE snapshotting. A refetch that started before this mutation
      // would otherwise resolve after the patch and overwrite the optimistic
      // value with data fetched before the change — the subtle bug in almost
      // every hand-rolled optimistic update.
      await client.cancelQueries({ queryKey: subscriptionKeys.detail(id) });
      await client.cancelQueries({ queryKey: subscriptionKeys.list() });

      const snapshot = snapshotSubscriptionCaches(client, id);

      if (removes) {
        removeSubscriptionFromCaches(client, id);
      } else if (patch) {
        patchSubscriptionCaches(client, id, patch(vars));
      }

      return snapshot;
    },

    onError(error, _vars, context) {
      if (context) restoreSubscriptionCaches(client, context);
      // After the restore, never before: a failure notice on top of the value
      // that failed to save reads as though the change went through.
      onFailure?.(error);
    },

    onSuccess(data, vars) {
      if (!data) return;

      const id = subscriptionId(vars);
      // setQueryData for the detail entry (it may not exist yet on a cold open),
      // patch for the list row. The server row carries the recomputed
      // nextPaymentDate, pricePhases and allowedActions the client cannot derive.
      client.setQueryData(subscriptionKeys.detail(id), data);
      patchSubscriptionCaches(client, id, data);
    },

    onSettled(_data, _error, vars) {
      return invalidateSubscriptionCaches(client, subscriptionId(vars), {
        dashboard: affectsSpend,
      });
    },
  };
}
