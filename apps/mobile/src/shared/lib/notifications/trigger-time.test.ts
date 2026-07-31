import { describe, expect, it } from "bun:test";
import { triggerTime } from "./trigger-time";

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
    // Partial components are not enough to build an instant from.
    expect(triggerTime({ dateComponents: { year: 2026 } }, NOW)).toBeNull();
  });
});
