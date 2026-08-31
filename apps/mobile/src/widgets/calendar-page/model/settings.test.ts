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

  it("ignores a key this build no longer has", () => {
    // `maxIcons` was a setting until the logos grew and only two fit. An install
    // that still has it on disk reads back as a current one, not as a default.
    expect(
      parseStoredCalendarSettings({ weekStart: "sunday", maxIcons: 4 }),
    ).toEqual({ weekStart: "sunday", showDayTotals: true });
  });

  it("keeps showDayTotals off once it has been turned off", () => {
    // `false` is the value a truthiness check silently discards, which would
    // make the switch un-turn-off-able across a relaunch.
    expect(
      parseStoredCalendarSettings({ showDayTotals: false }).showDayTotals,
    ).toBe(false);
  });
});
