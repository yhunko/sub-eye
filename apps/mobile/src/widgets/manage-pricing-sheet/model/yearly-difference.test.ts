import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { yearlyDifference } from "./yearly-difference";

describe("yearlyDifference", () => {
  it("multiplies a monthly rise by twelve", () => {
    expect(yearlyDifference(300, 350, 1, SubscriptionPeriod.MONTH)).toBeCloseTo(
      600,
    );
  });

  it("reports a price DROP as negative — normalising the difference through a\n     helper that floors at zero would report no change at all", () => {
    expect(yearlyDifference(350, 300, 1, SubscriptionPeriod.MONTH)).toBeCloseTo(
      -600,
    );
  });

  it("scales by the cadence: the same £1 is £52 on a weekly subscription", () => {
    expect(yearlyDifference(9, 10, 1, SubscriptionPeriod.WEEK)).toBeCloseTo(
      52.14,
      1,
    );
  });

  it("divides a yearly price rather than repeating it twelve times", () => {
    expect(yearlyDifference(100, 220, 1, SubscriptionPeriod.YEAR)).toBeCloseTo(
      120,
    );
  });

  it("divides by the interval — every 3 months is a third of the yearly effect\n     of every month", () => {
    expect(yearlyDifference(0, 30, 3, SubscriptionPeriod.MONTH)).toBeCloseTo(
      120,
    );
  });
});
