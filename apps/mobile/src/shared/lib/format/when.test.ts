import { describe, expect, it, mock } from "bun:test";

// Paraglide's runtime touches expo-localization through the i18n barrel; stub the
// three message functions so this stays a pure unit test of the bucket logic.
// `dateLocale` is pinned to en-GB for the same reason the real one exists: the
// day/month order these assertions read is regional, not the module's choice.
let locale = "en-GB";

mock.module("@/shared/i18n", () => ({
  dateLocale: () => locale,
  m: {
    when_today: () => "Today",
    when_tomorrow: () => "Tomorrow",
    when_inDays: ({ days }: { days: number }) => `in ${days} days`,
    when_daysLeft: ({ days }: { days: number }) => `${days} days left`,
  },
}));

// Resolved rather than read off the env, which is usually unset: deleting `TZ`
// wedges Bun's cached zone and every later assignment is ignored, so the
// restore below has to name a real zone. (Same trap as `day.test.ts`.)
const originalTz =
  process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

const {
  daysUntil,
  formatCountdown,
  formatDaysUntil,
  formatRemaining,
  formatShortDate,
} = await import("./when");

describe("formatShortDate", () => {
  it("drops the year only while it is the current one", () => {
    expect(formatShortDate("2026-08-03T00:00:00.000Z")).toBe("3 Aug");
    expect(formatShortDate("2027-02-05T00:00:00.000Z")).toBe("5 Feb 2027");
  });

  // What a cancelled row and the ended card both print. A past date has to
  // render as a date, not as a countdown clamped to "Today".
  it("renders a past date as itself", () => {
    expect(formatShortDate("2025-11-30T00:00:00.000Z")).toBe("30 Nov 2025");
  });

  // The regression this module shipped with: the tag was pinned to en-GB, so a
  // Ukrainian UI printed "5 Feb 2027" beside its own "через 4 дн.".
  it("follows the app's locale", () => {
    locale = "uk";
    expect(formatShortDate("2027-02-05T00:00:00.000Z")).toBe("5 лют. 2027 р.");
    locale = "en-GB";
  });
});

describe("formatCountdown", () => {
  // Unlike formatDaysUntil it never falls back to a date: the detail card prints
  // the date beside it, and two spellings of the same day read as a bug.
  it("keeps counting days past the fortnight", () => {
    expect(formatCountdown(0)).toBe("Today");
    expect(formatCountdown(1)).toBe("Tomorrow");
    expect(formatCountdown(47)).toBe("in 47 days");
  });
});

describe("formatRemaining", () => {
  // The same distance as formatCountdown, worded as a window running out. "In
  // 326 days" is an event approaching; access you already hold is time left.
  it("counts down a window rather than up to an event", () => {
    expect(formatRemaining(326)).toBe("326 days left");
    expect(formatCountdown(326)).toBe("in 326 days");
  });

  // The last day and the day before read the same either way, so they share the
  // countdown's wording rather than earning two more catalog keys.
  it("keeps today and tomorrow", () => {
    expect(formatRemaining(0)).toBe("Today");
    expect(formatRemaining(-4)).toBe("Today");
    expect(formatRemaining(1)).toBe("Tomorrow");
  });
});

describe("formatDaysUntil", () => {
  // Anything already due reads as Today — a negative count is noise to the user.
  it("renders 0 and any past count as Today", () => {
    expect(formatDaysUntil(0, "2026-07-20T00:00:00.000Z")).toBe("Today");
    expect(formatDaysUntil(-3, "2026-07-17T00:00:00.000Z")).toBe("Today");
  });

  it("renders 1 as Tomorrow", () => {
    expect(formatDaysUntil(1, "2026-07-21T00:00:00.000Z")).toBe("Tomorrow");
  });

  it("renders 2..13 as a day count", () => {
    expect(formatDaysUntil(5, "2026-07-25T00:00:00.000Z")).toBe("in 5 days");
    expect(formatDaysUntil(13, "2026-08-02T00:00:00.000Z")).toBe("in 13 days");
  });

  // Past a fortnight "in 47 days" stops being useful; a date is easier to scan.
  it("renders 14 and beyond as a short date", () => {
    expect(formatDaysUntil(14, "2026-08-03T00:00:00.000Z")).toBe("3 Aug");
    expect(formatDaysUntil(200, "2027-02-05T00:00:00.000Z")).toBe("5 Feb 2027");
  });
});

describe("daysUntil", () => {
  // `now` is built from the LOCAL clock while the targets stay `…Z`, because
  // that is the asymmetry `daysUntil` exists to handle: it counts from the
  // device's calendar day to a stored UTC midnight. A `…Z` literal for `now`
  // would name a different device day everywhere but UTC, which is how every
  // case here quietly depended on the machine running the suite.

  // Whole-day difference, not elapsed hours: 23:00 today → 01:00 tomorrow is 1 day.
  it("counts calendar days, not 24h blocks", () => {
    const now = new Date(2026, 6, 20, 23, 0);
    expect(daysUntil("2026-07-21T01:00:00.000Z", now)).toBe(1);
  });

  it("returns 0 for a date later the same day", () => {
    const now = new Date(2026, 6, 20, 1, 0);
    expect(daysUntil("2026-07-20T23:00:00.000Z", now)).toBe(0);
  });

  it("returns a negative count for a past date", () => {
    const now = new Date(2026, 6, 20, 12, 0);
    expect(daysUntil("2026-07-18T12:00:00.000Z", now)).toBe(-2);
  });

  // The hours the iOS widget used to contradict this function in. It counted
  // BOTH sides in UTC, so between local midnight and UTC midnight it named a
  // different "today" — Home's rail said "Renews Tomorrow" and the widget said
  // "in 2 days" for the same charge, every night from 00:00 to 03:00 in Kyiv.
  //
  // The zone is pinned rather than taken from the machine: the whole point is
  // an instant where the device's calendar day and UTC's disagree, and on a
  // runner sitting in UTC there is no such instant to test.
  it("counts from the device's day, not UTC's, before UTC has caught up", () => {
    process.env.TZ = "Europe/Kyiv";
    const now = new Date(2026, 7, 26, 2, 20);

    // It really is still the 25th in UTC — otherwise this asserts nothing.
    expect(now.toISOString()).toBe("2026-08-25T23:20:00.000Z");
    expect(daysUntil("2026-08-27T00:00:00.000Z", now)).toBe(1);
    expect(daysUntil("2026-08-26T00:00:00.000Z", now)).toBe(0);

    process.env.TZ = originalTz;
  });
});
