import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { buildBillingDetails } from "../src";

describe("buildBillingDetails", () => {
  // Production held one subscription stored as "USD". Rate-table keys are
  // lowercase, so an unnormalized lookup misses and falls back to 1:1 — while
  // `preferred.amount`, which normalizes, converts correctly. One result, two
  // answers that contradict each other.
  it("reports the true rate for a mixed-case currency code", () => {
    const details = buildBillingDetails(
      {
        amount: 10,
        currency: "USD",
        every: 1,
        period: SubscriptionPeriod.MONTH,
      },
      "uah",
      { usd: 1 / 41.5 },
    );

    expect(details.preferred.amount).toBeCloseTo(415, 10);
    expect(details.preferred.exchangeRate).toBeCloseTo(41.5, 10);
  });
});
