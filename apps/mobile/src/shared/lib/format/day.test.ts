import { afterEach, describe, expect, it } from "bun:test";
import { fromIsoDay, isFutureDay, toIsoDay } from "./day";

// Resolved rather than read straight off the env, because `TZ` is usually
// unset: `delete process.env.TZ` wedges Bun's cached zone and every later
// assignment is then ignored, so the restore has to name a real zone.
const originalTz =
  process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

afterEach(() => {
  process.env.TZ = originalTz;
});

// Bun applies a TZ change to every Date built after it, so each case sets the
// zone before constructing its picker value. The bug shifts in both directions,
// which is why both signs of offset are here.
describe("toIsoDay", () => {
  it("keeps the picked day west of UTC, where the raw instant rolls forward", () => {
    process.env.TZ = "America/Los_Angeles";
    const picked = new Date(2026, 7, 5, 18, 30);

    expect(picked.toISOString()).toBe("2026-08-06T01:30:00.000Z");
    expect(toIsoDay(picked)).toBe("2026-08-05T00:00:00.000Z");
  });

  it("keeps the picked day east of UTC, where the raw instant rolls back", () => {
    process.env.TZ = "Pacific/Auckland";
    const picked = new Date(2026, 7, 5, 1, 30);

    expect(picked.toISOString()).toBe("2026-08-04T13:30:00.000Z");
    expect(toIsoDay(picked)).toBe("2026-08-05T00:00:00.000Z");
  });
});

describe("isFutureDay", () => {
  it("rejects the local tomorrow that serialises into the past", () => {
    process.env.TZ = "America/Los_Angeles";
    const now = new Date("2026-08-01T01:00:00.000Z"); // 2026-07-31 18:00 PDT
    const tomorrow = new Date(2026, 7, 1, 18, 0);

    // The picker's own instant is a day away, so a guard reading it accepts
    // this — and then stores 2026-08-01T00:00Z, an hour BEHIND `now`.
    expect(tomorrow.getTime() > now.getTime()).toBe(true);
    expect(isFutureDay(tomorrow, now)).toBe(false);
  });

  it("accepts the next day that clears the UTC boundary", () => {
    process.env.TZ = "America/Los_Angeles";
    const now = new Date("2026-08-01T01:00:00.000Z");

    expect(isFutureDay(new Date(2026, 7, 2, 18, 0), now)).toBe(true);
  });
});

describe("fromIsoDay", () => {
  it("round-trips a stored day, so an untouched edit cannot move it", () => {
    process.env.TZ = "America/Los_Angeles";

    expect(toIsoDay(fromIsoDay("2026-08-15T00:00:00.000Z"))).toBe(
      "2026-08-15T00:00:00.000Z",
    );
    expect(fromIsoDay("2026-08-15T00:00:00.000Z").getDate()).toBe(15);
  });
});
