import type { SubscriptionDto } from "@subeye/model";
import { listSubscriptions } from "@subeye/store";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";

export const subscriptionKeys = {
  all: () => ["subscriptions"] as const,
  // NO PARAMETERS, deliberately. Search / status / category / sort are applied in
  // memory by applySubscriptionFilters (../model/filters). Putting any of them
  // here is what makes the retired web client fetch the list twice per visit and
  // once per keystroke.
  list: () => ["subscriptions", "list"] as const,
  detail: (id: string) => ["subscriptions", "detail", id] as const,
};

/**
 * The whole subscription list, unfiltered and unsorted. "Many subscriptions"
 * for one person is tens, not thousands — the entire list is one small document,
 * and holding it locally is what makes search free.
 */
export function subscriptionsQuery() {
  return queryOptions({
    queryKey: subscriptionKeys.list(),
    queryFn: (): Promise<SubscriptionDto[]> => listSubscriptions(localPorts),
  });
}

/**
 * The list row for `id`, if the list query already holds it.
 *
 * This is the cache-seeding read: the detail screen paints name, price, next
 * payment and status from this instantly, then swaps in the real detail read.
 * Returns undefined on a cold start (deep link, killed app), so callers must
 * still handle a loading state.
 */
export function getCachedSubscriptionRow(
  client: QueryClient,
  id: string,
): SubscriptionDto | undefined {
  return client
    .getQueryData<SubscriptionDto[]>(subscriptionKeys.list())
    ?.find((item) => item.id === id);
}
