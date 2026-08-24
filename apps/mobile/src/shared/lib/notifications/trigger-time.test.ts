import { describe, expect, it } from "bun:test";
import { repeatsForever, triggerTime } from "./trigger-time";

const NOW = new Date(2026, 6, 29, 12, 0).getTime();

describe("triggerTime", () => {
  // The shape a DATE trigger ACTUALLY reads back as on iOS. Reading `.value` or
  // `.date` here returns undefined, which made the status section report
  // "nothing scheduled" over a full, working schedule.
  it("reads the iOS calendar shape a DATE trigger becomes", () => {
    const at = triggerTime(
      {
        class: "UNCalendarNotificationTrigger",
        type: "calendar",
        repeats: false,
        dateComponents: {
          year: 2026,
          month: 8,
          day: 2,
          hour: 9,
          minute: 0,
          second: 0,
        },
      },
      NOW,
    );

    // month 8 is August — 1-based in DateComponents, 0-based in Date.
    expect(at).toBe(new Date(2026, 7, 2, 9, 0).getTime());
  });

  it("defaults the missing time components rather than returning null", () => {
    expect(
      triggerTime({ dateComponents: { year: 2026, month: 1, day: 5 } }, NOW),
    ).toBe(new Date(2026, 0, 5, 0, 0).getTime());
  });

  it("estimates an iOS time-interval trigger from now", () => {
    expect(triggerTime({ type: "timeInterval", seconds: 5 }, NOW)).toBe(
      NOW + 5000,
    );
  });

  it("reads Android's real timestamp", () => {
    expect(triggerTime({ type: "date", value: NOW + 1000 }, NOW)).toBe(
      NOW + 1000,
    );
  });

  it("returns null for a shape it cannot read", () => {
    expect(triggerTime({ type: "push" }, NOW)).toBeNull();
    expect(triggerTime({ type: "unknown" }, NOW)).toBeNull();
    expect(triggerTime(null, NOW)).toBeNull();
    expect(triggerTime("nonsense", NOW)).toBeNull();
    // Partial components are not enough to build an instant from. A bare year is
    // NOT a recurrence — a recurrence is what has no year.
    expect(triggerTime({ dateComponents: { year: 2026 } }, NOW)).toBeNull();
  });
});

/**
 * A repeating trigger reads back through the same `dateComponents`, minus the
 * components it recurs over — so the year is gone, and with it the guard the
 * absolute branch relies on. Every shape below returned `null` before Plan C,
 * which left the status section reporting no next fire time over a schedule that
 * was working perfectly.
 */
describe("triggerTime — repeating triggers", () => {
  const ios = (dateComponents: Record<string, number>) => ({
    class: "UNCalendarNotificationTrigger",
    type: "calendar",
    repeats: true,
    dateComponents: { ...dateComponents, isLeapMonth: false },
  });

  it("reads a DAILY rule as today or tomorrow", () => {
    // 29 July 12:00. 14:00 is still ahead today; 09:00 has gone, so it is
    // tomorrow's — not a time in the past, and not null.
    expect(triggerTime(ios({ hour: 14, minute: 30 }), NOW)).toBe(
      new Date(2026, 6, 29, 14, 30).getTime(),
    );
    expect(triggerTime(ios({ hour: 9, minute: 0 }), NOW)).toBe(
      new Date(2026, 6, 30, 9, 0).getTime(),
    );
  });

  // `weekday` is 1–7 from SUNDAY, not `Date.getDay()`'s 0–6. Reading it as
  // 0-based lands the answer a day early, every week.
  it("reads a WEEKLY rule, counting Sunday as 1", () => {
    // 29 July 2026 is a Wednesday, so weekday 5 is the Thursday after it.
    expect(triggerTime(ios({ weekday: 5, hour: 9, minute: 0 }), NOW)).toBe(
      new Date(2026, 6, 30, 9, 0).getTime(),
    );
    // Weekday 1 is Sunday — 2 August.
    expect(triggerTime(ios({ weekday: 1, hour: 9, minute: 0 }), NOW)).toBe(
      new Date(2026, 7, 2, 9, 0).getTime(),
    );
  });

  it("reads a MONTHLY rule, rolling to next month once the day has passed", () => {
    expect(triggerTime(ios({ day: 31, hour: 9, minute: 0 }), NOW)).toBe(
      new Date(2026, 6, 31, 9, 0).getTime(),
    );
    // Day 13 of July is behind us, so the answer is 13 August — the case that
    // matters most, because it is the one a naive "today at 09:00" gets wrong.
    expect(triggerTime(ios({ day: 13, hour: 9, minute: 0 }), NOW)).toBe(
      new Date(2026, 7, 13, 9, 0).getTime(),
    );
  });

  it("reads a YEARLY rule, and its month is 1-based on the way back", () => {
    // Month 8 in `DateComponents` is August, as for a DATE trigger.
    expect(
      triggerTime(ios({ month: 8, day: 14, hour: 9, minute: 0 }), NOW),
    ).toBe(new Date(2026, 7, 14, 9, 0).getTime());
    // February is already behind us in July, so this one is next year's.
    expect(
      triggerTime(ios({ month: 2, day: 1, hour: 9, minute: 0 }), NOW),
    ).toBe(new Date(2027, 1, 1, 9, 0).getTime());
  });

  // Android puts the components at the top level and reports `month` in the
  // 0-based range the JS input used — the opposite of iOS's read-back.
  it("reads Android's flat shape, with a 0-based month", () => {
    expect(
      triggerTime(
        { type: "monthly", day: 13, hour: 9, minute: 0, channelId: "renewals" },
        NOW,
      ),
    ).toBe(new Date(2026, 7, 13, 9, 0).getTime());

    expect(
      triggerTime(
        { type: "yearly", month: 7, day: 14, hour: 9, minute: 0 },
        NOW,
      ),
    ).toBe(new Date(2026, 7, 14, 9, 0).getTime());

    expect(triggerTime({ type: "daily", hour: 14, minute: 30 }, NOW)).toBe(
      new Date(2026, 6, 29, 14, 30).getTime(),
    );
  });

  // A 29 February rule fires one year in four. Scanning has to reach it rather
  // than give up and report nothing scheduled.
  it("reaches a leap day several years out", () => {
    expect(
      triggerTime(ios({ month: 2, day: 29, hour: 9, minute: 0 }), NOW),
    ).toBe(new Date(2028, 1, 29, 9, 0).getTime());
  });
});

// The status section reads a count as a countdown unless it knows which of the
// pending set the OS will re-fire on its own.
describe("repeatsForever", () => {
  it("tells a recurrence apart from a one-shot on both platforms", () => {
    expect(
      repeatsForever({
        type: "calendar",
        dateComponents: { day: 13, hour: 9, minute: 0 },
      }),
    ).toBe(true);
    expect(
      repeatsForever({ type: "monthly", day: 13, hour: 9, minute: 0 }),
    ).toBe(true);

    // A DATE trigger on iOS: same `type`, but it carries the year.
    expect(
      repeatsForever({
        type: "calendar",
        dateComponents: { year: 2026, month: 8, day: 2, hour: 9, minute: 0 },
      }),
    ).toBe(false);
    expect(repeatsForever({ type: "date", value: NOW })).toBe(false);
    expect(repeatsForever({ type: "timeInterval", seconds: 5 })).toBe(false);
    expect(repeatsForever(null)).toBe(false);
  });
});
