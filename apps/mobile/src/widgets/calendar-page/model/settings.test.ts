import { describe, expect, it } from "bun:test";
import {
  DEFAULT_CALENDAR_SETTINGS,
  parseStoredCalendarSettings,
} from "./settings";

describe("parseStoredCalendarSettings", () => {
  it("falls back to the defaults for a blob that is not an object", () => {
    // What a first launch reads, and what a truncated write leaves behind.
    for (const raw of [null, undefined, "", 7, []]) {
      expect(parseStoredCalendarSettings(raw)).toEqual(
        DEFAULT_CALENDAR_SETTINGS,
      );
    }
  });

  it("clamps maxIcons into a count a tile can actually draw", () => {
    // 0 renders a tile with no logos and nothing but "+N"; 40 overflows the
    // tile's own row. Neither failure names its cause on screen.
    expect(parseStoredCalendarSettings({ maxIcons: 0 }).maxIcons).toBe(2);
    expect(parseStoredCalendarSettings({ maxIcons: 40 }).maxIcons).toBe(5);
    expect(parseStoredCalendarSettings({ maxIcons: 3.6 }).maxIcons).toBe(4);
    expect(parseStoredCalendarSettings({ maxIcons: "many" }).maxIcons).toBe(
      DEFAULT_CALENDAR_SETTINGS.maxIcons,
    );
  });

  it("keeps a stored weekStart only when it is one this app renders", () => {
    expect(parseStoredCalendarSettings({ weekStart: "sunday" }).weekStart).toBe(
      "sunday",
    );
    // A build that once wrote a locale tag here would otherwise offset the whole
    // grid by an unknown number of columns.
    expect(
      parseStoredCalendarSettings({ weekStart: "saturday" }).weekStart,
    ).toBe("monday");
  });

  it("keeps showDayTotals off once it has been turned off", () => {
    // `false` is the value a truthiness check silently discards, which would
    // make the switch un-turn-off-able across a relaunch.
    expect(
      parseStoredCalendarSettings({ showDayTotals: false }).showDayTotals,
    ).toBe(false);
  });
});
