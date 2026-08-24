import type { SubscriptionDto } from "@subeye/model";
import type { QueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/entities/dashboard";
import { subscriptionKeys } from "../api/list";

export type SubscriptionPatch = Partial<SubscriptionDto>;

/**
 * The two cache entries any single-subscription write can touch, captured before
 * it happens. The list is one plain array under one key (search and sort are
 * applied in memory), so a snapshot is two reads — no page walking.
 */
export type SubscriptionCacheSnapshot = {
  id: string;
  detail: SubscriptionDto | undefined;
  list: SubscriptionDto[] | undefined;
};

export function snapshotSubscriptionCaches(
  client: QueryClient,
  id: string,
): SubscriptionCacheSnapshot {
  return {
    id,
    detail: client.getQueryData<SubscriptionDto>(subscriptionKeys.detail(id)),
    list: client.getQueryData<SubscriptionDto[]>(subscriptionKeys.list()),
  };
}

export function patchSubscriptionCaches(
  client: QueryClient,
  id: string,
  patch: SubscriptionPatch,
): void {
  // The updater form only fires when the entry exists, so an id that was never
  // cached — or a list row with no detail entry yet — is left alone instead of
  // materialising a half-shaped subscription.
  client.setQueryData<SubscriptionDto>(
    subscriptionKeys.detail(id),
    (previous) => (previous ? { ...previous, ...patch } : previous),
  );

  client.setQueryData<SubscriptionDto[]>(subscriptionKeys.list(), (previous) =>
    previous?.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

export function removeSubscriptionFromCaches(
  client: QueryClient,
  id: string,
): void {
  client.setQueryData<SubscriptionDto[]>(subscriptionKeys.list(), (previous) =>
    previous?.filter((item) => item.id !== id),
  );
  // removeQueries, not setQueryData(undefined): in v5 an undefined value from a
  // setter means "no change", so it would leave the deleted row's detail entry
  // in place. restoreSubscriptionCaches writes it back if the delete fails.
  client.removeQueries({ queryKey: subscriptionKeys.detail(id), exact: true });
}

export function restoreSubscriptionCaches(
  client: QueryClient,
  snapshot: SubscriptionCacheSnapshot,
): void {
  client.setQueryData(subscriptionKeys.detail(snapshot.id), snapshot.detail);
  client.setQueryData(subscriptionKeys.list(), snapshot.list);
}

/**
 * Surgical on purpose. The retired web client fired four invalidations plus a
 * forced analytics refetch after every mutation
 * (apps/client/src/entities/subscription/lib/handle-subscription-mutation-success.ts).
 * Here: the detail entry, the list, and the dashboard only when the money moved.
 *
 * `refetchType: "active"` keeps a deleted subscription from being re-fetched —
 * its screen has already popped, so nothing observes that key.
 */
export function invalidateSubscriptionCaches(
  client: QueryClient,
  id: string,
  options: { dashboard?: boolean } = {},
): Promise<void> {
  const jobs = [
    client.invalidateQueries({
      queryKey: subscriptionKeys.detail(id),
      refetchType: "active",
    }),
    client.invalidateQueries({
      queryKey: subscriptionKeys.list(),
      refetchType: "active",
    }),
  ];

  if (options.dashboard) {
    jobs.push(
      client.invalidateQueries({
        queryKey: dashboardKeys.all,
        refetchType: "active",
      }),
    );
  }

  return Promise.all(jobs).then(() => undefined);
}
