import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { CYCLES, cycleCounts, matchCycle } from "./cadence";

describe("matchCycle", () => {
  it("names the preset a stored subscription is already on", () => {
    expect(matchCycle("3", SubscriptionPeriod.MONTH)?.key).toBe("quarterly");
    expect(matchCycle("2", SubscriptionPeriod.WEEK)?.key).toBe("biweekly");
  });

  it("distinguishes counts that share a period", () => {
    // The failure this guards: matching on period alone made every monthly
    // cadence read as "Monthly", so a quarterly subscription edited and saved
    // came back billing every month.
    expect(matchCycle("1", SubscriptionPeriod.MONTH)?.key).toBe("monthly");
    expect(matchCycle("6", SubscriptionPeriod.MONTH)?.key).toBe("semiannual");
  });

  it("leaves a cadence no preset covers to the wheels", () => {
    expect(matchCycle("7", SubscriptionPeriod.DAY)).toBeUndefined();
    expect(matchCycle("18", SubscriptionPeriod.MONTH)).toBeUndefined();
  });

  it("does not claim a preset for a string the presets cannot produce", () => {
    // "01" is every 1 month, but the menu writes "1" — treating it as the
    // monthly preset would show a checked menu the wheels disagree with.
    expect(matchCycle("01", SubscriptionPeriod.MONTH)).toBeUndefined();
    expect(matchCycle("", SubscriptionPeriod.MONTH)).toBeUndefined();
  });

  it("offers each period at least once, so no period is menu-only", () => {
    const periods = new Set(CYCLES.map((cycle) => cycle.period));
    expect(periods).toEqual(new Set(Object.values(SubscriptionPeriod)));
  });
});

describe("cycleCounts", () => {
  it("starts at 1 — a cadence of zero payments is not a cadence", () => {
    expect(cycleCounts("1")[0]).toBe(1);
  });

  it("carries in a count from before the wheel existed", () => {
    // Without this the wheel shows 1 while the form holds 120, and the first
    // flick commits that mismatch as the user's real billing cycle.
    expect(cycleCounts("120")).toContain(120);
    expect(cycleCounts("120").at(-1)).toBe(120);
  });

  it("adds nothing for a count already on the wheel, or for a non-count", () => {
    expect(cycleCounts("7")).toHaveLength(cycleCounts("1").length);
    expect(cycleCounts("")).toHaveLength(cycleCounts("1").length);
    expect(cycleCounts("2.5")).toHaveLength(cycleCounts("1").length);
  });
});
