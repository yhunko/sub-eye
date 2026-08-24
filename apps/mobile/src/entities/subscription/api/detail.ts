import type { SubscriptionDto } from "@subeye/model";
import {
  type QueryClient,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";
import { getCachedSubscriptionRow, subscriptionKeys } from "./list";

/**
 * One subscription, by id.
 *
 * Seeded from the list cache, which is exact rather than partial: the list and
 * the detail route return the SAME SubscriptionDto, pricePhases and
 * allowedActions included. So the screen paints complete on the first frame when
 * it was opened from the list, and only shows a spinner on a cold start (deep
 * link, killed app).
 *
 * It still always refetches. GET /:id is the one read the server allows to
 * write — it runs `applyDuePhases`, settling any phase boundary that has passed
 * since the list was fetched. Serving a seed without revalidating would leave a
 * price change permanently unapplied.
 */
export function subscriptionDetailQuery(client: QueryClient, id: string) {
  const seed = getCachedSubscriptionRow(client, id);

  return queryOptions({
    queryKey: subscriptionKeys.detail(id),
    queryFn: async (): Promise<SubscriptionDto> => {
      const response = await apiClient.api.subscriptions[":id"].$get({
        param: { id },
      });
      assertOk(response);
      return response.json();
    },
    initialData: seed,
    // Epoch 0 marks the seed as already stale, so the refetch fires immediately
    // instead of waiting out a staleTime the seed never earned.
    initialDataUpdatedAt: seed ? 0 : undefined,
    refetchOnMount: "always",
  });
}

export function useSubscriptionDetail(id: string) {
  const client = useQueryClient();
  return useQuery(subscriptionDetailQuery(client, id));
}
