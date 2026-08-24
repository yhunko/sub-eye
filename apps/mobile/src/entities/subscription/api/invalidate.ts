import type { QueryClient } from "@tanstack/react-query";
import { dashboardKeys, monthlySummaryKeys } from "@/entities/dashboard";
import { subscriptionKeys } from "./list";

/**
 * Everything a subscription write can move.
 *
 * `subscriptionKeys.all()` is the prefix over both the list and every detail
 * entry, so one call covers what used to be two. The two analytics keys do not
 * share a root — the monthly summary is `["analytics", …]` — and every write
 * here changes what is charged, so both go.
 *
 * `refetchType: "active"` keeps a deleted subscription from being fetched back:
 * its screen has already popped, so nothing observes that key.
 */
export function invalidateSubscriptionData(client: QueryClient): Promise<void> {
  return Promise.all(
    [subscriptionKeys.all(), dashboardKeys.all, monthlySummaryKeys.all].map(
      (queryKey) =>
        client.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  ).then(() => undefined);
}
