import type { QueryClient } from "@tanstack/react-query";
import { calendarKeys } from "@/entities/calendar";
import { dashboardKeys, monthlySummaryKeys } from "@/entities/dashboard";
import { subscriptionKeys } from "./list";

/**
 * Everything a subscription write can move.
 *
 * `subscriptionKeys.all()` is the prefix over both the list and every detail
 * entry, so one call covers what used to be two. The analytics keys do not share
 * a root — the monthly summary is `["analytics", …]` and the calendar is
 * `["calendar", month]` — and every write here changes what is charged, so all
 * of them go. `calendarKeys.all` is the prefix over every cached month, not just
 * the one on screen: an edit moves occurrences into and out of months the user
 * has already paged through.
 *
 * `refetchType: "active"` keeps a deleted subscription from being fetched back:
 * its screen has already popped, so nothing observes that key.
 */
export function invalidateSubscriptionData(client: QueryClient): Promise<void> {
  return Promise.all(
    [
      subscriptionKeys.all(),
      dashboardKeys.all,
      monthlySummaryKeys.all,
      calendarKeys.all,
    ].map((queryKey) =>
      client.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  ).then(() => undefined);
}
