import { useSyncExternalStore } from "react";
import { deviceJson } from "@/shared/lib/mmkv";

export const WEEK_STARTS = ["monday", "sunday"] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

/**
 * How many brand logos a tile may draw before it collapses the rest into "+N".
 *
 * Two is the floor because one logo plus "+4" says less than two logos plus
 * "+3"; five is the ceiling because a 14pt logo at that count already fills the
 * tile's width at the default text size, and the tile is the thing that has to
 * give at accessibility sizes.
 */
export const MIN_ICONS = 2;
export const MAX_ICONS = 5;

export type CalendarSettings = {
  weekStart: WeekStart;
  maxIcons: number;
  showDayTotals: boolean;
};

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  // Monday, not the device's region. `Intl.Locale.prototype.getWeekInfo` is not
  // in Hermes, so the only ways to derive this are a hand-kept region table or
  // shipping a tzdb — both larger than the switch this screen already needs for
  // the users whose region disagrees with their habit.
  weekStart: "monday",
  maxIcons: 3,
  showDayTotals: true,
};

const STORAGE_KEY = "calendar.settings";

/**
 * Settings read back off the device, clamped to something the grid can draw.
 *
 * Never throws and never trusts. `maxIcons` is the one that matters: a blob from
 * an older build — or a hand-edited one — carrying `0` or `40` renders a tile
 * with no logos or a tile that overflows its own row, and neither failure says
 * anything about where it came from.
 */
export function parseStoredCalendarSettings(raw: unknown): CalendarSettings {
  const stored = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as Partial<CalendarSettings>;

  const icons = Number(stored.maxIcons);

  return {
    weekStart: WEEK_STARTS.includes(stored.weekStart as WeekStart)
      ? (stored.weekStart as WeekStart)
      : DEFAULT_CALENDAR_SETTINGS.weekStart,
    maxIcons: Number.isFinite(icons)
      ? Math.min(MAX_ICONS, Math.max(MIN_ICONS, Math.round(icons)))
      : DEFAULT_CALENDAR_SETTINGS.maxIcons,
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
