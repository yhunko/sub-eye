import { useSyncExternalStore } from "react";
import { deviceJson } from "@/shared/lib/mmkv";

export const WEEK_STARTS = ["monday", "sunday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export type CalendarSettings = {
  weekStart: WeekStart;
  showDayTotals: boolean;
};

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  // Monday, not the device's region. `Intl.Locale.prototype.getWeekInfo` is not
  // in Hermes, so the only ways to derive this are a hand-kept region table or
  // shipping a tzdb — both larger than the switch this screen already needs for
  // the users whose region disagrees with their habit.
  weekStart: "monday",
  showDayTotals: true,
};

const STORAGE_KEY = "calendar.settings";

/**
 * Settings read back off the device.
 *
 * Never throws and never trusts: a blob written by an older build is the normal
 * case, not the exception, and one carrying a `maxIcons` this no longer has is
 * simply ignored along with anything else it does not recognise.
 */
export function parseStoredCalendarSettings(raw: unknown): CalendarSettings {
  const stored = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as Partial<CalendarSettings>;

  return {
    weekStart: WEEK_STARTS.includes(stored.weekStart as WeekStart)
      ? (stored.weekStart as WeekStart)
      : DEFAULT_CALENDAR_SETTINGS.weekStart,
    showDayTotals:
      typeof stored.showDayTotals === "boolean"
        ? stored.showDayTotals
        : DEFAULT_CALENDAR_SETTINGS.showDayTotals,
  };
}

/**
 * The calendar's display preferences, held outside React.
 *
 * Same shape and same reason as `subscriptionFilters`: the settings sheet is a
 * separate ROUTE — the navigator owns sheet presentation here — so it cannot be
 * a child of the page and cannot write into its `useState`. The grid behind the
 * sheet has to repaint as each switch moves, which is the whole point of
 * putting the controls in a sheet rather than on a pushed screen.
 *
 * Unlike the list's filters these are preferences rather than a gesture, so
 * every one of them persists.
 */
let state: CalendarSettings = parseStoredCalendarSettings(
  deviceJson.get<unknown>(STORAGE_KEY, null),
);

const listeners = new Set<() => void>();

export const calendarSettings = {
  // The same reference until something writes — a fresh object per call is an
  // infinite loop in useSyncExternalStore.
  get: (): CalendarSettings => state,

  set: (patch: Partial<CalendarSettings>): void => {
    state = parseStoredCalendarSettings({ ...state, ...patch });
    deviceJson.set(STORAGE_KEY, state);
    for (const listener of listeners) listener();
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useCalendarSettings(): CalendarSettings {
  return useSyncExternalStore(calendarSettings.subscribe, calendarSettings.get);
}
