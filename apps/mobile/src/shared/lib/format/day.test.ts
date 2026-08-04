import { afterEach, describe, expect, it } from "bun:test";
import { deriveSubscriptionStatus } from "@subeye/shared";
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
  // At 18:00 on 31 July in Los Angeles it is already 1 August in UTC, so the
  // day the user picks as "tomorrow" serialises to an instant an hour BEHIND
  // `now`. Guarded against the instant, this returned false: the user could not
  // pick their own tomorrow, and the picker offered them nothing else.
  //
  // Both sides are days now, so it is accepted — and it is only SAFE to accept
  // because the stored value is read back as a day too. The assertion below is
  // the other half of that pair: against a raw instant, `deriveSubscriptionStatus`
  // would see 2026-08-01T00:00Z <= now and lapse the pause on the spot, which is
  // the failure the old guard was working around rather than fixing.
  it("accepts the local tomorrow that serialises behind `now`", () => {
    process.env.TZ = "America/Los_Angeles";
    const now = new Date("2026-08-01T01:00:00.000Z"); // 2026-07-31 18:00 PDT
    const tomorrow = new Date(2026, 7, 1, 18, 0);

    expect(toIsoDay(tomorrow)).toBe("2026-08-01T00:00:00.000Z");
    expect(Date.parse(toIsoDay(tomorrow))).toBeLessThan(now.getTime());
    expect(isFutureDay(tomorrow, now)).toBe(true);

    expect(
      deriveSubscriptionStatus(
        { pausedAt: "2026-07-01T00:00:00.000Z", resumeAt: toIsoDay(tomorrow) },
        now,
        "America/Los_Angeles",
      ),
    ).toBe("paused");
  });

  it("rejects today, which is not ahead of anything", () => {
    process.env.TZ = "America/Los_Angeles";
    const now = new Date("2026-08-01T01:00:00.000Z");

    expect(isFutureDay(new Date(2026, 6, 31, 18, 0), now)).toBe(false);
  });

  it("accepts the day after next", () => {
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
