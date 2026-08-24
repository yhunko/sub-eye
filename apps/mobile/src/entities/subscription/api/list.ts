import type { SubscriptionDto, SubscriptionListPageDto } from "@subeye/model";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";

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
 * The whole subscription list for the signed-in user, unfiltered and unsorted.
 * "Many subscriptions" for one person is tens, not thousands — the entire list is
 * one small payload, and holding it locally is what makes search free.
 */
/**
 * Runaway guard, not a page budget. The server's cursor is an offset that always
 * advances and returns null when exhausted, so this can only trip if the API
 * starts handing back a non-advancing cursor — in which case a phone looping on
 * the network forever is a worse failure than a short list.
 */
const MAX_PAGES = 20;

export function subscriptionsQuery() {
  return queryOptions({
    queryKey: subscriptionKeys.list(),
    queryFn: async (): Promise<SubscriptionDto[]> => {
      const items: SubscriptionDto[] = [];
      let cursor: string | undefined;
      let page = 0;

      // Followed to exhaustion, NOT capped with a bigger `limit`. Every screen
      // treats this array as the whole list — search, filters and sort all run
      // in memory over it — so a partial first page is silent data loss rather
      // than pagination, and raising the server's default 50 is the same bug
      // with a larger number in it.
      do {
        // `status: "all"` is NOT a no-op. The server defaults an absent status to
        // "active" (subscriptionService.getSubscriptionsPage), and its "active"
        // means active + cancelling — so omitting this drops every paused and
        // cancelled subscription before it reaches the device. Every screen
        // treats this array as the complete list, so the Paused and Cancelled
        // filter chips were permanently empty and the category counts were
        // short.
        const response = await apiClient.api.subscriptions.$get({
          query: cursor ? { status: "all", cursor } : { status: "all" },
        });
        assertOk(response);
        const body: SubscriptionListPageDto<SubscriptionDto> =
          await response.json();
        items.push(...body.items);
        cursor = body.nextCursor ?? undefined;
        page += 1;
      } while (cursor && page < MAX_PAGES);

      return items;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * The list row for `id`, if the list query already holds it.
 *
 * This is the cache-seeding read: the detail screen (Plan 7) paints name, price,
 * next payment and status from this instantly, then swaps in the real detail
 * response. Returns undefined on a cold start (deep link, killed app), so callers
 * must still handle a loading state.
 */
export function getCachedSubscriptionRow(
  client: QueryClient,
  id: string,
): SubscriptionDto | undefined {
  return client
    .getQueryData<SubscriptionDto[]>(subscriptionKeys.list())
    ?.find((item) => item.id === id);
}
