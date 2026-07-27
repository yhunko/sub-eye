import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { cycleProgress } from "./cycle";

const monthly = {
  every: 1,
  period: SubscriptionPeriod.MONTH,
  lastPaymentDate: "2026-07-01T00:00:00.000Z",
  nextPaymentDate: "2026-08-01T00:00:00.000Z",
};

const at = (iso: string) => Date.parse(iso);

describe("cycleProgress", () => {
  it("measures from the last charge to the next", () => {
    expect(cycleProgress(monthly, at("2026-07-01T00:00:00.000Z"))).toBe(0);
    expect(cycleProgress(monthly, at("2026-07-16T12:00:00.000Z"))).toBeCloseTo(
      0.5,
      2,
    );
  });

  it("clamps outside the cycle", () => {
    expect(cycleProgress(monthly, at("2026-06-20T00:00:00.000Z"))).toBe(0);
    expect(cycleProgress(monthly, at("2026-08-09T00:00:00.000Z"))).toBe(1);
  });

  // A subscription that has never billed still gets a bar: the cycle is assumed
  // to be one period long, ending at the next payment.
  it("falls back to the nominal period without a last payment", () => {
    const fresh = { ...monthly, lastPaymentDate: null };
    expect(cycleProgress(fresh, at("2026-07-17T00:00:00.000Z"))).toBeCloseTo(
      0.5,
      1,
    );
  });

  it("survives an unparseable next payment", () => {
    expect(cycleProgress({ ...monthly, nextPaymentDate: "" })).toBe(0);
  });
});
