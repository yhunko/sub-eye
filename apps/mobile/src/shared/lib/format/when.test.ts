import { describe, expect, it, mock } from "bun:test";

// Paraglide's runtime touches expo-localization through the i18n barrel; stub the
// three message functions so this stays a pure unit test of the bucket logic.
mock.module("@/shared/i18n", () => ({
  m: {
    when_today: () => "Today",
    when_tomorrow: () => "Tomorrow",
    when_inDays: ({ days }: { days: number }) => `in ${days} days`,
  },
}));

const { daysUntil, formatCountdown, formatDaysUntil, formatShortDate } =
  await import("./when");

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
  // Whole-day difference, not elapsed hours: 23:00 today → 01:00 tomorrow is 1 day.
  it("counts calendar days, not 24h blocks", () => {
    const now = new Date("2026-07-20T23:00:00.000Z");
    expect(daysUntil("2026-07-21T01:00:00.000Z", now)).toBe(1);
  });

  it("returns 0 for a date later the same day", () => {
    const now = new Date("2026-07-20T01:00:00.000Z");
    expect(daysUntil("2026-07-20T23:00:00.000Z", now)).toBe(0);
  });

  it("returns a negative count for a past date", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    expect(daysUntil("2026-07-18T12:00:00.000Z", now)).toBe(-2);
  });
});
