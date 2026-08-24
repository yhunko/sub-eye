import { describe, expect, test } from "bun:test";
import { DateTimezoneUtils, RecurrenceUtils } from "../src";

// `toCalendarDay` hands back a `TZDate`, whose `toISOString` prints the offset
// form `+00:00` rather than `Z`. Re-wrapping the instant in a plain `Date`
// asserts against the canonical spelling the rest of the app stores.
const iso = (value: Date): string => new Date(value.getTime()).toISOString();

describe("RecurrenceUtils", () => {
  // A raw ISO string handed straight to getNextOccurrence resolves in the HOST
  // zone; only a value that has been through toCalendarDay is zone-stable. This
  // asserts the safe path, and is the test that fails if someone removes the
  // toCalendarDay funnel from a call site.
  test("a calendar-day anchor projects identically in any host zone", () => {
    const anchor = DateTimezoneUtils.toCalendarDay("2026-01-31");
    const relativeTo = DateTimezoneUtils.toCalendarDay("2026-04-10");

    const next = RecurrenceUtils.getNextOccurrence(
      anchor,
      1,
      "month",
      relativeTo,
    );

    expect(iso(next)).toBe("2026-04-30T00:00:00.000Z");
  });

  // Jan 31 + 1 month must clamp to Feb 28, and the NEXT step must measure from
  // the anchor again — stepping from the clamped value would drag every later
  // occurrence back to the 28th.
  test("a clamped month does not drag later occurrences back", () => {
    const anchor = DateTimezoneUtils.toCalendarDay("2026-01-31");

    const feb = RecurrenceUtils.addPeriod(anchor, 1, "month");
    const mar = RecurrenceUtils.addPeriod(anchor, 2, "month");

    expect(iso(feb)).toBe("2026-02-28T00:00:00.000Z");
    expect(iso(mar)).toBe("2026-03-31T00:00:00.000Z");
  });
});
