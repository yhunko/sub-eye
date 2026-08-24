import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import {
  isSameUtcDay,
  normalizeAmount,
  normalizeIsoDate,
  resolveScheduledEffectiveAt,
  toStartOfUtcDay,
} from "../src/phaseScheduling";

const subscription = {
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2020-01-10T00:00:00.000Z",
};

const now = new Date("2026-08-24T09:00:00.000Z");

describe("resolveScheduledEffectiveAt", () => {
  // "nextOccurrence" means "raise the price at the next renewal, not mid-cycle".
  // The returned instant must land on the 10th, the anchor day.
  it("resolves nextOccurrence to the subscription's next renewal", () => {
    expect(
      resolveScheduledEffectiveAt(
        subscription,
        { mode: "nextOccurrence" },
        now,
        "UTC",
      ),
    ).toBe("2026-09-10T00:00:00.000Z");
  });

  // The renewal falling on today has a midnight that is already past, so it must
  // step forward a full period — a price change must never be scheduled in the
  // past. While the function read `Date.now()` this could not be asserted at all.
  it("steps forward a full period when the renewal is earlier today", () => {
    expect(
      resolveScheduledEffectiveAt(
        subscription,
        { mode: "nextOccurrence" },
        new Date("2026-09-10T12:00:00.000Z"),
        "UTC",
      ),
    ).toBe("2026-10-10T00:00:00.000Z");
  });

  // The step forward is anchored to the ORIGINAL payment date, not to the day it
  // stepped from: without the anchor a clamped month (31 Jan → 28 Feb) drags
  // every later boundary back to the 28th and it never returns to the 31st.
  it("keeps the step forward on the original day of the month", () => {
    expect(
      resolveScheduledEffectiveAt(
        {
          every: 1,
          period: SubscriptionPeriod.MONTH,
          paymentDate: "2026-01-31T00:00:00.000Z",
        },
        { mode: "nextOccurrence" },
        new Date("2026-02-28T12:00:00.000Z"),
        "UTC",
      ),
    ).toBe("2026-03-31T00:00:00.000Z");
  });

  // A custom date is floored to the start of its UTC day. Without the floor,
  // "1 August" scheduled at 14:00 would leave the old price live for fourteen
  // hours of a day the user believes is already at the new price.
  it("floors a custom date to start of day", () => {
    const effectiveAt = resolveScheduledEffectiveAt(
      subscription,
      { mode: "customDate", customDate: "2030-08-01T14:33:07.000Z" },
      now,
      "UTC",
    );

    expect(effectiveAt).toBe("2030-08-01T00:00:00.000Z");
  });

  // The account's timezone must not move a boundary off its calendar day: the
  // client picks "1 August" and reads it back in UTC, so flooring in Europe/Kyiv
  // stored 31 July and the app showed the offer ending a day early.
  it("floors to the same day whatever the account timezone", () => {
    expect(
      resolveScheduledEffectiveAt(
        subscription,
        { mode: "customDate", customDate: "2030-08-01T00:00:00.000Z" },
        now,
        "Europe/Kyiv",
      ),
    ).toBe("2030-08-01T00:00:00.000Z");
  });

  // Returning null (rather than throwing) is how a pure package reports a
  // caller error. The server turns this into CustomDateRequiredError.
  it("returns null when custom mode has no date", () => {
    expect(
      resolveScheduledEffectiveAt(
        subscription,
        { mode: "customDate" },
        now,
        "UTC",
      ),
    ).toBeNull();
  });

  // The de-duplication rule: if the user picks the same calendar day as the
  // next renewal, snap to the exact renewal instant rather than midnight, so
  // the phase boundary and the charge land together instead of hours apart.
  it("snaps a custom date onto the next occurrence when they share a day", () => {
    const next = resolveScheduledEffectiveAt(
      subscription,
      { mode: "nextOccurrence" },
      now,
      "UTC",
    );
    const custom = resolveScheduledEffectiveAt(
      subscription,
      { mode: "customDate", customDate: next },
      now,
      "UTC",
    );

    expect(custom).toBe(next);
  });
});

describe("toStartOfUtcDay", () => {
  // A phase boundary is a calendar day, stored as its UTC midnight — the same
  // encoding `toIsoDay` writes on the client and `formatDate` reads back. It
  // must not depend on any zone, and it must come back in the canonical `Z`
  // form: these strings are sliced to `YYYY-MM-DD` by both clients.
  it("floors to the UTC midnight of the day, in Z form", () => {
    expect(toStartOfUtcDay("2026-07-15T10:00:00.000Z")).toBe(
      "2026-07-15T00:00:00.000Z",
    );
    expect(toStartOfUtcDay("2026-07-15T00:00:00.000Z")).toBe(
      "2026-07-15T00:00:00.000Z",
    );
  });
});

describe("isSameUtcDay", () => {
  it("compares by UTC calendar day", () => {
    expect(
      isSameUtcDay("2026-07-15T00:30:00.000Z", "2026-07-15T23:30:00.000Z"),
    ).toBe(true);
    expect(
      isSameUtcDay("2026-07-15T23:30:00.000Z", "2026-07-16T00:30:00.000Z"),
    ).toBe(false);
  });
});

describe("normalizeIsoDate / normalizeAmount", () => {
  it("normalizes strings and Dates to ISO, and null-ish to null", () => {
    expect(normalizeIsoDate("2026-07-15T00:00:00Z")).toBe(
      "2026-07-15T00:00:00.000Z",
    );
    expect(normalizeIsoDate(new Date("2026-07-15T00:00:00Z"))).toBe(
      "2026-07-15T00:00:00.000Z",
    );
    expect(normalizeIsoDate(null)).toBeNull();
    expect(normalizeIsoDate(undefined)).toBeNull();
  });

  // Amounts are stored in a numeric(10,2) column and compared as strings.
  // Always exactly two decimals, or "12" and "12.00" stop being equal.
  it("formats an amount to exactly two decimals", () => {
    expect(normalizeAmount(12)).toBe("12.00");
    expect(normalizeAmount(0)).toBe("0.00");
    expect(normalizeAmount(9.999)).toBe("10.00");
  });
});
