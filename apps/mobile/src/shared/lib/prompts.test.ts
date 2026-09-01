import { describe, expect, it } from "bun:test";
import { nextPrompt } from "./prompts";

const quiet = {
  tracked: 5,
  isPro: false,
  remindersOn: true,
  remindersAsked: true,
  proPitched: true,
  reviewDue: false,
};

describe("nextPrompt", () => {
  it("says nothing when every gate is closed", () => {
    expect(nextPrompt(quiet)).toBeNull();
  });

  it("never returns two things at once", () => {
    // The whole reason this is one function: all three are eligible here, and
    // a paywall followed by "enjoying SubEye?" is the sequence it exists to
    // make impossible.
    expect(
      nextPrompt({
        tracked: 5,
        isPro: false,
        remindersOn: false,
        remindersAsked: false,
        proPitched: false,
        reviewDue: true,
      }),
    ).toBe("reminders");
  });

  it("offers reminders before asking for money", () => {
    expect(
      nextPrompt({
        ...quiet,
        remindersOn: false,
        remindersAsked: false,
        proPitched: false,
      }),
    ).toBe("reminders");
  });

  it("does not re-offer reminders the user already declined", () => {
    expect(nextPrompt({ ...quiet, remindersOn: false })).toBeNull();
  });

  it("waits for a third subscription before pitching Pro", () => {
    expect(nextPrompt({ ...quiet, proPitched: false, tracked: 2 })).toBeNull();
    expect(nextPrompt({ ...quiet, proPitched: false, tracked: 3 })).toBe("pro");
  });

  it("pitches Pro once, ever", () => {
    expect(nextPrompt({ ...quiet, proPitched: true })).toBeNull();
  });

  it("never pitches Pro to someone who already bought it", () => {
    expect(nextPrompt({ ...quiet, proPitched: false, isPro: true })).toBeNull();
  });

  it("falls through to the rating sheet once the others are spent", () => {
    expect(nextPrompt({ ...quiet, reviewDue: true })).toBe("review");
  });
});
