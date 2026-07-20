import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import {
  isSameCalendarDayInTimezone,
  normalizeAmount,
  normalizeIsoDate,
  resolveScheduledEffectiveAt,
  toStartOfDayInTimezone,
} from "../src/phaseScheduling";

const subscription = {
  every: 1,
  period: SubscriptionPeriod.MONTH,
  // Anchor far in the past so the next occurrence is always in the future.
  paymentDate: "2020-01-10T00:00:00.000Z",
};

describe("resolveScheduledEffectiveAt", () => {
  // "nextOccurrence" means "raise the price at the next renewal, not mid-cycle".
  // The returned instant must land on the 10th, the anchor day.
  it("resolves nextOccurrence to the subscription's next renewal", () => {
    const effectiveAt = resolveScheduledEffectiveAt(
      subscription,
      { mode: "nextOccurrence" },
      "UTC",
    );

    expect(effectiveAt).not.toBeNull();
    expect(new Date(effectiveAt as string).getUTCDate()).toBe(10);
    expect(Date.parse(effectiveAt as string)).toBeGreaterThan(Date.now());
  });

  // A custom date is floored to midnight IN THE USER'S TIMEZONE. Without the
  // floor, "1 August" scheduled at 14:00 would leave the old price live for
  // fourteen hours of a day the user believes is already at the new price.
  it("floors a custom date to start of day", () => {
    const effectiveAt = resolveScheduledEffectiveAt(
      subscription,
      { mode: "customDate", customDate: "2030-08-01T14:33:07.000Z" },
      "UTC",
    );

    // `DateTimezoneUtils.toZoned` returns a TZDate, whose `toISOString()` keeps
    // the zone offset instead of normalizing to `Z`. Same instant, offset form.
    expect(effectiveAt).toBe("2030-08-01T00:00:00.000+00:00");
  });

  // Returning null (rather than throwing) is how a pure package reports a
  // caller error. The server turns this into CustomDateRequiredError.
  it("returns null when custom mode has no date", () => {
    expect(
      resolveScheduledEffectiveAt(subscription, { mode: "customDate" }, "UTC"),
    ).toBeNull();
  });

  // The de-duplication rule: if the user picks the same calendar day as the
  // next renewal, snap to the exact renewal instant rather than midnight, so
  // the phase boundary and the charge land together instead of hours apart.
  it("snaps a custom date onto the next occurrence when they share a day", () => {
    const next = resolveScheduledEffectiveAt(
      subscription,
      { mode: "nextOccurrence" },
      "UTC",
    );
    const custom = resolveScheduledEffectiveAt(
      subscription,
      { mode: "customDate", customDate: next },
      "UTC",
    );

    expect(custom).toBe(next);
  });
});

describe("toStartOfDayInTimezone", () => {
  // Proves the timezone is honoured: midnight in Kyiv (UTC+3 in July) is 21:00
  // UTC on the previous day. A naive UTC floor would be three hours wrong and
  // would put the boundary on the wrong calendar day for the user.
  it("floors to midnight in the given timezone, not UTC", () => {
    const floored = toStartOfDayInTimezone(
      "2026-07-15T10:00:00.000Z",
      "Europe/Kyiv",
    );
    // Offset form, because `toZoned` returns a TZDate.
    expect(floored).toBe("2026-07-15T00:00:00.000+03:00");
    // ...which is the same instant as 21:00 UTC on the previous day.
    expect(Date.parse(floored)).toBe(Date.parse("2026-07-14T21:00:00.000Z"));
  });
});

describe("isSameCalendarDayInTimezone", () => {
  it("compares by calendar day in the given timezone", () => {
    expect(
      isSameCalendarDayInTimezone(
        "2026-07-15T00:30:00.000Z",
        "2026-07-15T23:30:00.000Z",
        "UTC",
      ),
    ).toBe(true);
    expect(
      isSameCalendarDayInTimezone(
        "2026-07-15T23:30:00.000Z",
        "2026-07-16T00:30:00.000Z",
        "UTC",
      ),
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
