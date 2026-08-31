import { describe, expect, it } from "bun:test";
import {
  DEFAULT_REMINDER_SETTINGS,
  effectiveSettings,
  FREE_LEAD_DAYS,
  toggleLeadDay,
} from "../src";

const pro = {
  ...DEFAULT_REMINDER_SETTINGS,
  renewals: true,
  renewalLeadDays: [0, 3, 7],
  trials: true,
  trialLeadDays: [3, 7],
  hour: 21,
};

describe("effectiveSettings", () => {
  it("leaves a Pro configuration alone", () => {
    expect(effectiveSettings(pro, true)).toEqual(pro);
  });

  // The gate must never sit between "warned" and "not warned": free keeps the
  // reminder itself, and keeps the hour, because a warning that arrives at 3am
  // is not a free feature.
  it("clamps a free install to one lead time and no trial warnings", () => {
    const free = effectiveSettings(pro, false);

    expect(free.renewals).toBe(true);
    expect(free.hour).toBe(21);
    expect(free.renewalLeadDays).toEqual(FREE_LEAD_DAYS);
    expect(free.trials).toBe(false);
  });

  // Clamping must not be destructive — the purchase has to restore the exact
  // schedule the user configured, not a default one.
  it("does not rewrite the stored configuration", () => {
    effectiveSettings(pro, false);
    expect(pro.renewalLeadDays).toEqual([0, 3, 7]);
  });
});

describe("toggleLeadDay", () => {
  it("adds in ascending order and removes", () => {
    expect(toggleLeadDay([3], 0)).toEqual([0, 3]);
    expect(toggleLeadDay([0, 3], 3)).toEqual([0]);
  });

  // An empty list is a switch that reads "on" over a schedule that is never
  // built. Deselecting the last one is a no-op instead of going silent.
  it("refuses to empty the list", () => {
    expect(toggleLeadDay([1], 1)).toEqual([1]);
  });
});
