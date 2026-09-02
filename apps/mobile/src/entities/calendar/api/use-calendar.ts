import { buildCalendarMonth, buildCalendarYear } from "@subeye/store";
import { useQuery } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";

export const calendarKeys = {
  all: ["calendar"] as const,
  month: (month: string) => ["calendar", "month", month] as const,
  year: (year: string) => ["calendar", "year", year] as const,
};

/**
 * Both projections are pure functions of the stored list — they take the month
 * or the year to build and never read a clock — so nothing here goes stale on
 * its own, and the default `staleTime: 0` had every page of the pager re-run a
 * full list read, parse and occurrence walk each time virtualisation remounted
 * it. `invalidateSubscriptionData` already covers `calendarKeys.all`, which is
 * the only thing that can actually change the answer.
 */
const PROJECTION = { staleTime: Number.POSITIVE_INFINITY } as const;

/**
 * One month of dated events. `month` is the first day of it, UTC midnight.
 *
 * Keyed by the month so paging back and forth renders from cache rather than
 * reprojecting every occurrence again.
 */
export function useCalendarMonth(month: string, enabled = true) {
  return useQuery({
    queryKey: calendarKeys.month(month),
    queryFn: () => buildCalendarMonth(localPorts, month),
    enabled,
    ...PROJECTION,
  });
}

/** Twelve months of daily spend. `year` is 1 January of it, UTC midnight. */
export function useCalendarYear(year: string, enabled = true) {
  return useQuery({
    queryKey: calendarKeys.year(year),
    queryFn: () => buildCalendarYear(localPorts, year),
    enabled,
    ...PROJECTION,
  });
}
