import { buildCalendarMonth } from "@subeye/store";
import { useQuery } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";

export const calendarKeys = {
  all: ["calendar"] as const,
  month: (month: string) => ["calendar", month] as const,
};

/**
 * One month of dated events. `month` is the first day of it, UTC midnight.
 *
 * Keyed by the month so paging back and forth renders from cache rather than
 * reprojecting every occurrence again. `enabled` is what a locked screen passes:
 * the projection is a synchronous walk over the whole list, and a free install
 * has no calendar to spend it on.
 */
export function useCalendarMonth(month: string, enabled = true) {
  return useQuery({
    queryKey: calendarKeys.month(month),
    queryFn: () => buildCalendarMonth(localPorts, month),
    enabled,
  });
}
