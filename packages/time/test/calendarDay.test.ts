import { describe, expect, test } from "bun:test";
import { DateTimezoneUtils } from "../src";

const iso = (value: Date): string => new Date(value.getTime()).toISOString();

describe("DateTimezoneUtils.currentCalendarDay", () => {
  // The account timezone decides WHICH day it is; the result is still that
  // day's UTC midnight, so it compares directly against a stored day. Returning
  // a zoned start-of-day instant instead is what made a payment falling today
  // get stepped straight past for anyone west of UTC.
  test("the zone picks the day, the result is that day's UTC midnight", () => {
    const instant = new Date("2026-03-01T04:00:00.000Z");

    expect(iso(DateTimezoneUtils.currentCalendarDay(instant, "UTC"))).toBe(
      "2026-03-01T00:00:00.000Z",
    );
    expect(
      iso(DateTimezoneUtils.currentCalendarDay(instant, "America/Los_Angeles")),
    ).toBe("2026-02-28T00:00:00.000Z");
  });
});

describe("DateTimezoneUtils.shiftCalendarMonths", () => {
  test("clamps to the shorter month instead of rolling over", () => {
    const jan31 = DateTimezoneUtils.toCalendarDay("2026-01-31");

    expect(iso(DateTimezoneUtils.shiftCalendarMonths(jan31, 1))).toBe(
      "2026-02-28T00:00:00.000Z",
    );
    expect(iso(DateTimezoneUtils.shiftCalendarMonths(jan31, 2))).toBe(
      "2026-03-31T00:00:00.000Z",
    );
  });
});

describe("DateTimezoneUtils month bounds", () => {
  // endOfCalendarMonth is an INCLUSIVE bound — the last millisecond of the last
  // day, not the first instant of the next month.
  test("bound a month inclusively in UTC", () => {
    const midFebruary = DateTimezoneUtils.toCalendarDay("2026-02-10");

    expect(iso(DateTimezoneUtils.startOfCalendarMonth(midFebruary))).toBe(
      "2026-02-01T00:00:00.000Z",
    );
    expect(iso(DateTimezoneUtils.endOfCalendarMonth(midFebruary))).toBe(
      "2026-02-28T23:59:59.999Z",
    );
  });
});
